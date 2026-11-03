

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Subjects from './components/Subjects';
import MCQPractice from './components/MCQPractice';
import ShortAnswerPractice from './components/ShortAnswerPractice';
import Profile from './components/Profile';
import Library from './components/Library';
import MockInterview from './components/MockInterview';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/library" element={<Library />} />
          <Route path="/practice/mcq" element={<MCQPractice />} />
          <Route path="/practice/short" element={<ShortAnswerPractice />} />
          <Route path="/interview" element={<MockInterview />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
