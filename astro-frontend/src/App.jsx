import * as React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignIn from "./components/sign-in/SignIn";
import SignUp from "./components/sign-up/SignUp";
import Home from "./components/blog/Blog";
import ProtectedRoute from "./components/ProtectedRoute";
import UploadWork from "./components/upload-work/UploadWork";
import Checkout from "./components/checkout/Checkout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Protected route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload-work"
          element={
            <ProtectedRoute>
              <UploadWork />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
