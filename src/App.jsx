import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import SignUpForm from './components/SignUpForm';
import HomePage from './pages/HomePage';
import CourseDetails from './components/CourseDetails';
import PaymentPage from './components/PaymentPage';
import CourseLearn from './components/CourseLearn';
import Footer from './components/FooterInfo';
import Navbar from './components/Navbar'; // ✅ Import Navbar
import ScrollToTop from './components/ScrollToTop';
import './components/styles.css';

// Layout wrapper to include Navbar and Footer conditionally
function Layout({ children }) {
  const location = useLocation();
  const hideFooter = location.pathname === '/signup';
  const hideNavbar = location.pathname === '/signup';

  return (
    <>
      {!hideNavbar && <Navbar />} {/* ✅ Show Navbar on all pages except signup */}
      {children}
      {!hideFooter && <Footer />} {/* ✅ Show Footer on all pages except signup */}
    </>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/course/:id"
          element={
            <Layout>
              <CourseDetails />
            </Layout>
          }
        />
        <Route path="/signup" element={<SignUpForm />} />
        <Route
          path="/courses/:id/payment"
          element={
            <Layout>
              <PaymentPage />
            </Layout>
          }
        />
        <Route
          path="/courses/:id/learn"
          element={
            <Layout>
              <CourseLearn />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
