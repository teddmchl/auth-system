export default function LoadingSpinner({ label }) {
    return (
        <div className="spinner-container">
            <div className="spinner"></div>
            {label && <p className="spinner-label">{label}</p>}
        </div>
    );
}
