 // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
  import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut
  } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyACCjH8Be3FHsZnXDj2qf6ksgdrMq6zbOc",
    authDomain: "intern4-27de2.firebaseapp.com",
    projectId: "intern4-27de2",
    storageBucket: "intern4-27de2.firebasestorage.app",
    messagingSenderId: "916037799260",
    appId: "1:916037799260:web:66ce889d87306acdd24599",
    measurementId: "G-7SER094D9R"
  };


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseReadyPromise = Promise.resolve(auth);
window.firebaseCreateUser = createUserWithEmailAndPassword;
window.firebaseSendEmailVerification = sendEmailVerification;
window.firebaseSignIn = signInWithEmailAndPassword;
window.firebaseSignOut = firebaseSignOut;

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDB = db;

// Make sure Firebase is ready
window.firebaseReady = true;
console.log('Firebase initialized successfully');

// Authentication state observer
onAuthStateChanged(auth, (user) => {
  try {
    if (user) {
      console.log('User is signed in:', user.email);
      // Persist basic user info for components relying on localStorage
      const storedUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User')
      };
      try {
        localStorage.setItem('firebaseUser', JSON.stringify(storedUser));
      } catch (e) {
        console.warn('Unable to persist firebaseUser to localStorage:', e);
      }

      // Update UI for signed-in user - try multiple approaches
      updateUIForSignedInUser(user);
      
      // Call global UI update functions if available (for homepage)
      if (typeof window.updateUIForLoggedInUser === 'function') {
        window.updateUIForLoggedInUser(storedUser);
      }
      
      // Additional check: if we're on the homepage, ensure UI updates
      if (window.location.pathname.includes('Homepage.html') || 
          window.location.pathname.endsWith('/') || 
          window.location.pathname === '') {
        setTimeout(() => {
          if (typeof window.updateUIForLoggedInUser === 'function') {
            window.updateUIForLoggedInUser(storedUser);
          }
        }, 500);
      }
    } else {
      console.log('User is signed out');
      // Clear stored user
      try {
        localStorage.removeItem('firebaseUser');
      } catch (e) {
        console.warn('Unable to remove firebaseUser from localStorage:', e);
      }

      // Update UI for signed-out user
      updateUIForSignedOutUser();
      
      // Call global UI update functions if available (for homepage)
      if (typeof window.updateUIForGuestUser === 'function') {
        window.updateUIForGuestUser();
      }
      
      // Additional check: if we're on the homepage, ensure UI updates
      if (window.location.pathname.includes('Homepage.html') || 
          window.location.pathname.endsWith('/') || 
          window.location.pathname === '') {
        setTimeout(() => {
          if (typeof window.updateUIForGuestUser === 'function') {
            window.updateUIForGuestUser();
          }
        }, 500);
      }
    }
  } catch (e) {
    console.error('Auth state handling error:', e);
  }
});

// Helper functions
function updateUIForSignedInUser(user) {
  // Update navigation to show "My Orders" link and user info
  const signInBtn = document.querySelector('.btn-secondary');
  if (signInBtn) {
    signInBtn.textContent = `My Orders`;
    signInBtn.href = 'orders.html';
    signInBtn.onclick = null;
    
    // Add sign out button if it doesn't exist
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu && !document.getElementById('signout-btn')) {
      const signOutBtn = document.createElement('button');
      signOutBtn.id = 'signout-btn';
      signOutBtn.className = 'btn-secondary';
      signOutBtn.textContent = 'Sign Out';
      signOutBtn.style.marginLeft = '10px';
      signOutBtn.onclick = () => signOut();
      navMenu.appendChild(signOutBtn);
    }
  }
}

function updateUIForSignedOutUser() {
  // Reset navigation to show sign in button
  const signInBtn = document.querySelector('.btn-secondary');
  const signOutBtn = document.getElementById('signout-btn');
  
  if (signInBtn) {
    signInBtn.textContent = 'Sign In';
    signInBtn.href = 'login.html';
    signInBtn.onclick = null;
  }
  
  // Remove sign out button if it exists
  if (signOutBtn) {
    signOutBtn.remove();
  }
}

// Sign out function
function signOut() {
  firebaseSignOut(auth).then(() => {
    try { localStorage.removeItem('firebaseUser'); } catch (e) {}
    console.log('User signed out successfully');
    // Redirect to homepage after logout
    window.location.href = 'Homepage.html';
  }).catch((error) => {
    console.error('Error signing out:', error);
    // Even on error, redirect to homepage
    window.location.href = 'Homepage.html';
  });
}

// Function to save order to Firestore
function saveOrderToFirebase(orderData) {
  const user = auth.currentUser;
  if (user) {
    const { collection, addDoc, serverTimestamp } = window.firebaseDB;
    addDoc(collection(window.firebaseDB, 'orders'), {
      userId: user.uid,
      userEmail: user.email,
      items: orderData.items,
      total: orderData.total,
      timestamp: serverTimestamp(),
      status: 'pending'
    }).then((docRef) => {
      console.log('Order saved with ID: ', docRef.id);
      alert('Order placed successfully!');
    }).catch((error) => {
      console.error('Error saving order: ', error);
      alert('Error placing order. Please try again.');
    });
  } else {
    alert('Please sign in to place an order.');
    window.location.href = 'login.html';
  }
}
// Expose helper for optional use in other scripts
window.saveOrderToFirebase = saveOrderToFirebase;

// Save product (pending for admin approval)
function addProductToFirebase(productData) {
  const user = auth.currentUser;
  if (user) {
    const { collection, addDoc, serverTimestamp } = window.firebaseDB;
    addDoc(collection(window.firebaseDB, "products"), {
      name: productData.name,
      price: productData.price,
      image: productData.image,
      description: productData.description || "",
      category: productData.category || "other",
      status: "pending",
      createdBy: user.uid,
      createdAt: serverTimestamp()
    }).then((docRef) => {
      console.log("Product added and pending approval:", docRef.id);
      alert("Product added successfully! It will be visible after admin approval.");
    }).catch((error) => {
      console.error("Error adding product:", error);
      alert("Error adding product. Please try again.");
    });
  } else {
    alert("Please sign in to add a product.");
    window.location.href = "login.html";
  }
}
window.addProductToFirebase = addProductToFirebase;

// Fetch all products from Firestore
function fetchProductsFromFirebase() {
  return new Promise((resolve, reject) => {
    const { collection, getDocs } = window.firebaseDB;
    getDocs(collection(window.firebaseDB, "products")).then((querySnapshot) => {
      const products = [];
      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        });
      });
      resolve(products);
    }).catch((error) => {
      console.error("Error fetching products:", error);
      reject(error);
    });
  });
}
window.fetchProductsFromFirebase = fetchProductsFromFirebase;