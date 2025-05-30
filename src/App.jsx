import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUpForm from './components/SignUpForm';
import HomePage from './pages/HomePage';
import CourseDetails from './components/CourseDetails';
import PaymentPage from './components/PaymentPage';
import CourseLearn from './components/CourseLearn'; // updated import
import './components/styles.css';
import Footer from "./components/FooterInfo";  // Adjust path if Footer.jsx is in another folder

function App() {
  return (
    <Router>
      {/* Your main content routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/courses/:id/payment" element={<PaymentPage />} />
        <Route path="/courses/:id/learn" element={<CourseLearn />} /> {/* New route */}
      </Routes>

      {/* Footer outside Routes so it shows on all pages */}
      <Footer />
    </Router>
  );
}

export default App;
