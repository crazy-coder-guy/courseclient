import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUpForm from './components/SignUpForm';
import HomePage from './pages/HomePage';
import CourseDetails from './components/CourseDetails';
import PaymentPage from './components/PaymentPage';
import CourseLearn from './components/CourseLearn'; // updated import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/courses/:id/payment" element={<PaymentPage />} />
        <Route path="/courses/:id/learn" element={<CourseLearn />} /> {/* New route */}
      </Routes>
    </Router>
  );
}

export default App;
