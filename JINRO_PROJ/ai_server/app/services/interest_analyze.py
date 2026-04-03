import cv2
import torch
import torch.nn.functional as F
from PIL import Image
import pandas as pd
from tqdm import tqdm
import os

# 3. 영상 분석 함수
def analyze_video_with_face_crop(video_path, model, transforms, class_names, device, face_detector, frame_skip=5, margin_ratio=0.2):
    if not os.path.exists(video_path):
        print(f"❌ 오류: '{video_path}' 경로에 동영상 파일이 없습니다.")
        return None, None

    cap = cv2.VideoCapture(video_path)
    
    # --- [수정된 부분] 프레임 수 가져오기 (WebM 대응) ---
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    # 프레임 수를 제대로 못 가져와서 0 이하라면 직접 셉니다.
    if total_frames <= 0:
        print("⚠️ 메타데이터에서 프레임 수를 읽을 수 없어 직접 계산합니다. (잠시만 기다려주세요...)")
        total_frames = 0
        while True:
            ret = cap.grab() # 디코딩 없이 빠르게 넘김
            if not ret:
                break
            total_frames += 1
        
        # 🌟 핵심 수정 부분: webm은 되감기(set)가 안 먹히므로 아예 닫고 새로 엽니다!
        cap.release() 
        cap = cv2.VideoCapture(video_path)
    # ----------------------------------------------------
    
    print(f"🎬 동영상 로드 완료! (총 프레임: {total_frames}, FPS: {fps:.2f})")
    print(f"⚡ {frame_skip} 프레임 간격으로 분석을 진행합니다.")

    frame_data_list = []
    interested_count = 0
    not_interested_count = 0
    valid_face_frames = 0 

    # 🌟 수정 1: range를 건너뛰지 말고 0부터 끝까지 순서대로 1씩 증가시킵니다.
    for current_frame in tqdm(range(total_frames), desc="영상 분석 중"):
        
        # 🌟 수정 2: cap.set을 아예 쓰지 않고, 순서대로 grab()으로 읽습니다.
        # 디코딩 없이 프레임 하나를 빠르게 넘깁니다.
        ret = cap.grab()
        
        if not ret:
            break # 영상을 끝까지 다 읽었으면 종료
            
        # 🌟 수정 3: 현재 읽은 프레임 번호가 우리가 원하는 간격(예: 5의 배수)일 때만 디코딩합니다.
        if current_frame % frame_skip == 0:
            
            # 조건에 맞을 때만 retrieve()를 호출하여 이미지를 꺼내옵니다.
            ret, frame = cap.retrieve()
            
            if not ret:
                continue # 혹시 실패하면 다음으로
                
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_detector.process(frame_rgb)
            
            if results.detections:
                detection = results.detections[0]
                bboxC = detection.location_data.relative_bounding_box
                ih, iw, _ = frame_rgb.shape
                
                x = int(bboxC.xmin * iw)
                y = int(bboxC.ymin * ih)
                w = int(bboxC.width * iw)
                h = int(bboxC.height * ih)
                
                margin_x = int(w * margin_ratio)
                margin_y = int(h * margin_ratio)
                
                x1 = max(0, x - margin_x)
                y1 = max(0, y - margin_y)
                x2 = min(iw, x + w + margin_x)
                y2 = min(ih, y + h + margin_y)
                
                face_crop = frame_rgb[y1:y2, x1:x2]
                
                # 얼굴 여백 계산 후 크기가 0이 되는 오류 방지
                if face_crop.size == 0:
                    continue
                
                pil_image = Image.fromarray(face_crop)
                image_tensor = transforms(pil_image).unsqueeze(0).to(device)
                
                with torch.no_grad():
                    outputs = model(image_tensor)
                    probs = F.softmax(outputs, dim=1)[0]
                    
                score_interested = probs[class_names.index('interested')].item() * 100
                score_not_interested = probs[class_names.index('not_interested')].item() * 100
                
                if score_interested >= score_not_interested:
                    final_pred = 'interested'
                    interested_count += 1
                else:
                    final_pred = 'not_interested'
                    not_interested_count += 1
                    
                valid_face_frames += 1

                # os.makedirs('test_img', exist_ok=True)
                # save_path = os.path.join('test_img', f"frame_{current_frame:04d}_{final_pred}.jpg")
                # pil_image.save(save_path)
                
            else:
                final_pred = 'No Face Detected'
                score_interested = 0.0
                score_not_interested = 0.0
                
            frame_data_list.append({
                'Frame': current_frame, # 저장할 프레임 번호 기록
                'Prediction': final_pred,
                'Interested_Score(%)': round(score_interested, 2),
                'Not_Interested_Score(%)': round(score_not_interested, 2)
            })

    cap.release()
    
    if valid_face_frames > 0:
        percent_interested = (interested_count / valid_face_frames) * 100
        percent_not_interested = (not_interested_count / valid_face_frames) * 100
    else:
        percent_interested, percent_not_interested = 0, 0
    
    overall_stats = {
        'Total_Frames_Analyzed': len(frame_data_list),
        'Frames_With_Face': valid_face_frames,
        'Interested_Percentage': round(percent_interested, 2),
        'Not_Interested_Percentage': round(percent_not_interested, 2)
    }
    
    df_frames = pd.DataFrame(frame_data_list)
    return df_frames, overall_stats