'use client';

export default function UserBubble({ userName, message }) {
  return (
    <div className="user-bubble">
      <span className="user-name-bubble">{userName}</span>
      <p className="user-message">{message}</p>
    </div>
  );
}
