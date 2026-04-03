import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../../css/counselor_css/CCatWrite.css";
import api from '../../../services/app'

export default function CCatWrite() {
  const location = useLocation();
  const navigate = useNavigate();

  const editData = location.state;

  const currentKindId =
    editData?.kindId ?? editData?.kind ?? null;

  const [categoryName, setCategoryName] = useState("");
  const [url, setUrl] = useState("");
  const [questions, setQuestions] = useState([
    {
      questionText: "",
      options: [
        "매우 그렇다.",
        "그런편이다.",
        "보통이다.",
        "그렇지 않은 편이다.",
        "매우 그렇지 않다.",
      ],
    },
  ]);

  useEffect(() => {
    if (editData) {
      setCategoryName(editData.title || "");
      setUrl(editData.url || "");

      if (editData.survey && editData.survey.length > 0) {
        setQuestions(editData.survey);
      }
    }
  }, [editData]);

  const handleQuestionChange = (index, value) => {
    const updated = [...questions];
    updated[index].questionText = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        options: [
          "매우 그렇다.",
          "그런편이다.",
          "보통이다.",
          "그렇지 않은 편이다.",
          "매우 그렇지 않다.",
        ],
      },
    ]);
  };

  const handleSave = async () => {
    console.log("categoryName:", categoryName);
    console.log("url:", url);
    console.log("currentKindId:", currentKindId);

    if (!categoryName || !url || !currentKindId) {
      alert("카테고리, URL, 중분류를 확인하세요.");
      return;
    }

    const payload = {
      title: categoryName,
      url: url,
      kind: currentKindId,
      survey: questions,
    };

    try {
      let response;

      if (editData?.c_id) {
        response = await api.put(
          `http://127.0.0.1:8000/counselor/category/${editData.c_id}`,
          payload
        );
      } else {
        response = await api.post(
          "http://127.0.0.1:8000/counselor/category",
          payload
        );
      }

      const data = await response.data;

      if (data.success) {
        alert(data.message);
        navigate(-1);
      } else {
        alert("저장 실패");
      }
    } catch (error) {
      console.error("저장 통신 에러:", error);
      alert("서버 통신 오류");
    }
  };

  return (
    <div className="category-add-container">

      <h2>{editData?.c_id ? "카테고리 수정" : "카테고리 추가"}</h2>

      <div className="form-row">
        <label>카테고리:</label>
        <input
          className="wide-input"
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>URL:</label>
        <input
          className="wide-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="question-scroll-area">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="question-block">

            <div className="question-header">
              <span>질문 {qIndex + 1}</span>
            </div>

            <textarea
              value={q.questionText}
              onChange={(e) =>
                handleQuestionChange(qIndex, e.target.value)
              }
            />

            <div className="option-grid">
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="option-item">
                  <label>{5 - oIndex}점</label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) =>
                      handleOptionChange(
                        qIndex,
                        oIndex,
                        e.target.value
                      )
                    }
                  />
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

      <div className="add-question-btn">
        <button type="button" onClick={handleAddQuestion}>
          질문 추가
        </button>
      </div>

      <div className="bottom-buttons">
        <button type="button" onClick={() => navigate(-1)}>
          취소
        </button>

        <button
          className="save-btn"
          type="button"
          onClick={handleSave}
        >
          저장
        </button>
      </div>

    </div>
  );
}