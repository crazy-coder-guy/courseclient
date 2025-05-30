import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUpForm from './components/SignUpForm';
import HomePage from './pages/HomePage';
import CourseDetails from './components/CourseDetails';
import PaymentPage from './components/PaymentPage';
import CourseLearn from './components/CourseLearn'; 
import './components/styles.css';
import Footer from "./components/FooterInfo"; 
import ScrollToTop from './components/ScrollToTop';  // import it

function App() {
  return (
    <Router>
      <ScrollToTop />  {/* Add ScrollToTop here */}
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/courses/:id/payment" element={<PaymentPage />} />
        <Route path="/courses/:id/learn" element={<CourseLearn />} />
      </Routes>

      <Footer />
    </Router>
  );
}

export default App;
