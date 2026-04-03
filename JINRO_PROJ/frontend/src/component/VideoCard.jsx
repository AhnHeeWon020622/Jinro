import styles from '../css/component_css/VideoCard.module.css'

export default function VideoCard(props) {

    return (
        <div className={styles.selectedItem}>
            <div className={styles.thumbnail}>
                <span style={{ color: '#E50914', fontWeight: 'bold' }}>N</span>
            </div>
            <div className={styles.itemInfo}>
                <h4>{props.video.mainCategory}</h4>
                <p>{props.video.subCategory}</p>
            </div>
            <button className={styles.deleteBtn} onClick={() => {props.handleDelete(props.video.id)}}>
                삭제
            </button>
        </div>
    );
};