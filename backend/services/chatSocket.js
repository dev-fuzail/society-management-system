export default function chatSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      console.log(`📌 User joined room: room_${roomId}`);
      socket.join(`room_${roomId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });
}
