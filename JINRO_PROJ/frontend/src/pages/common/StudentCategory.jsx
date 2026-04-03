import "../../css/common_css/StudentCategory.css";

function LayoutStudentCategory({ children }) {

  return (
    <div className="student-category-layout">

      <div className="student-category-inner">

        {children}

      </div>

    </div>
  );
}

export default LayoutStudentCategory;