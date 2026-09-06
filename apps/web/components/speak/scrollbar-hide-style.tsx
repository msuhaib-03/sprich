/**
 * Raw <style> — bypasses Lightning CSS, which strips scrollbar rules at build
 * time. Both the reply box and the chat history scroll with no visible
 * scrollbar chrome (the edge fades stand in as the scroll cue).
 * Render this once inside the conversation view.
 */
export function ScrollbarHideStyle() {
  return (
    <style>{`
      .reply-box, .chat-scroll { scrollbar-width: none; }
      .reply-box::-webkit-scrollbar,
      .chat-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }
    `}</style>
  );
}
