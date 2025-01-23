import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, set, remove, get, onValue } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

// Access Firebase instances from the global scope
const auth = window.firebaseAuth;
const db = window.firebaseDB;

// Realtime Database references
const messagesRef = ref(db, "messages");
const typingRef = ref(db, "typing");
const usersRef = ref(db, "users");

// Authenticate user anonymously
signInAnonymously(auth)
  .then(() => {
    console.log("Signed in anonymously");
  })
  .catch((error) => {
    console.error("Authentication error:", error.message);
  });

// Check if username exists, if not, prompt for it
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userRef = ref(db, `users/${user.uid}`);
    get(userRef).then((snapshot) => {
      if (!snapshot.exists()) {
        const username = prompt("Enter your username:");
        set(userRef, { username });
      }
    });
  }
});

// Send message function
window.sendMessage = function () {
  const messageInput = document.getElementById("message");
  const message = messageInput.value;

  if (message.trim() !== "") {
    push(messagesRef, {
      text: message,
      timestamp: Date.now(),
      uid: auth.currentUser.uid,
    })
      .then(() => {
        console.log("Message sent successfully");
        messageInput.value = ""; // Clear input field
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  } else {
    console.log("Message is empty");
  }
};

// Display messages
onChildAdded(messagesRef, (snapshot) => {
  const message = snapshot.val();
  const messagesDiv = document.getElementById("messages");

  const userRef = ref(db, `users/${message.uid}`);
  get(userRef).then((userSnapshot) => {
    const username = userSnapshot.val()?.username || "Anonymous";

    const messageDiv = document.createElement("div");
    messageDiv.id = snapshot.key;
    const date = new Date(message.timestamp);
    messageDiv.textContent = `${username} (${date.toLocaleString()}): ${message.text}`;

    // Add delete button
    if (message.uid === auth.currentUser.uid) {
      const deleteButton = document.createElement("button");
      deleteButton.classList.add("delete-btn");
      deleteButton.textContent = "Delete";
      deleteButton.onclick = () => {
        remove(ref(db, `messages/${snapshot.key}`))
          .then(() => {
            console.log("Message deleted successfully");
            messageDiv.remove();
          })
          .catch((error) => console.error("Error deleting message:", error));
      };
      messageDiv.appendChild(deleteButton);
    }

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
});

// Typing indicator
let typingTimeout;
document.getElementById("message").addEventListener("input", () => {
  const userTypingRef = ref(db, `typing/${auth.currentUser.uid}`);
  set(userTypingRef, true);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    set(userTypingRef, false);
  }, 1000);
});

const typingStatusDiv = document.getElementById("typing-status");
onValue(typingRef, (snapshot) => {
  const typingStatuses = snapshot.val();
  const typingUsers = Object.keys(typingStatuses || {}).filter(
    (uid) => typingStatuses[uid] && uid !== auth.currentUser.uid
  );

  typingStatusDiv.textContent =
    typingUsers.length > 0
      ? `${typingUsers.join(", ")} is typing...`
      : "";
});
