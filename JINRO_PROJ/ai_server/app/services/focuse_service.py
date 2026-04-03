import os
import cv2
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
import mediapipe as mp
from PIL import Image

# ===================================================================== 
# 🧠 1. 모델 아키텍처 (학습할 때 썼던 2D FrameMobileNetV2)
# =====================================================================
class FrameMobileNetV2(nn.Module):
    def __init__(self, num_classes=2):
        super(FrameMobileNetV2, self).__init__()
        self.backbone = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
        num_ftrs = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_ftrs, num_classes)
        )

    def forward(self, x):
        return self.backbone(x)

# =====================================================================
# 🎬 2. 미디어파이프 + 0.2 패딩 + 딕셔너리 반환 예측 함수
# =====================================================================
def analyze_video_to_json(video_path, model, device, debug_dir='test_img', stride=5):
    print(f"\n🎥 영상 분석을 시작합니다: {video_path}")

    # 1. 미디어파이프 초기화
    mp_face_detection = mp.solutions.face_detection
    face_detector = mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)

    # 2. 데이터 변환기 설정
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # 3. 비디오 열기
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "영상을 열 수 없습니다."}

    frame_idx = 0
    focus_score = 0
    unfocus_score = 0
    total_processed_frames = 0
    last_box = None

    print("\n⏳ [실시간 프레임 분석 중...]")
    
    with torch.no_grad():
        while True:
            ret, frame = cap.read()
            if not ret: break

            if frame_idx % stride == 0:
                h, w = frame.shape[:2]
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_detector.process(rgb_frame)

                if results.detections:
                    detection = results.detections[0]
                    bbox = detection.location_data.relative_bounding_box
                    l = int(bbox.xmin * w)
                    t = int(bbox.ymin * h)
                    r = int((bbox.xmin + bbox.width) * w)
                    b = int((bbox.ymin + bbox.height) * h)
                    
                    pad_x = int((r - l) * 0.2)
                    pad_y = int((b - t) * 0.2)
                    last_box = (max(0, t - pad_y), min(h, b + pad_y), max(0, l - pad_x), min(w, r + pad_x))
                    
                elif last_box is None:
                    last_box = (int(h*0.2), int(h*0.8), int(w*0.2), int(w*0.8))

                face_crop = rgb_frame[last_box[0]:last_box[1], last_box[2]:last_box[3]]
                
                # 얼굴 여백 계산 후 크기가 0이 되는 오류 방지
                if face_crop.size == 0:
                    frame_idx += 1
                    continue

                face_pil = Image.fromarray(face_crop)

                input_tensor = transform(face_pil).unsqueeze(0).to(device)
                
                outputs = model(input_tensor)
                probabilities = torch.softmax(outputs, dim=1)
                _, preds = torch.max(outputs, 1)
                
                label = preds.item()

                total_processed_frames += 1
                if label == 1:
                    focus_score += 1
                else:
                    unfocus_score += 1

            frame_idx += 1

    cap.release()
    face_detector.close()

    # 4. 결과 계산 및 반환 (딕셔너리)
    if total_processed_frames > 0:
        focus_rate = (focus_score / total_processed_frames) * 100
        unfocus_rate = (unfocus_score / total_processed_frames) * 100
        
        return {
            "status": "success",
            "total_extracted_frames": total_processed_frames,
            "focus_score": focus_score,
            "unfocus_score": unfocus_score,
            "focus_rate": round(focus_rate, 2),
            "unfocus_rate": round(unfocus_rate, 2),
        }
    else:
        return {
            "status": "failed",
            "error": "분석할 수 있는 프레임이 없습니다."
        }