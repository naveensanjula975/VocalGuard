import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-70px)] p-8 bg-gradient-to-br from-white to-gray-50">
      <div className="max-w-7xl mx-auto flex gap-16 relative lg:flex-row flex-col">
        <div className="flex-1 pt-12">
          <h1 className="text-5xl leading-tight font-semibold text-gray-900 mb-6 relative">
            Your trusted solution
            <br />
            for detecting AI
            <br />
            generated voices.
          </h1>

          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Ensure authenticity and security
            <br />
            with cutting-edge AI technology.
          </p>

          <Link
            to={user ? "/upload" : "/login"}
            className="inline-block px-8 py-4 bg-gradient-to-r from-pink-100 via-purple-100 to-pink-100 text-black rounded-xl font-medium mb-12 transition-transform hover:-translate-y-0.5">
            {user ? "Upload Voice" : "Get Started"}
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-gray-900 mb-2">Advanced Detection</h3>
              <p className="text-gray-600 text-sm">
                Identify AI-generated voices with high accuracy.
              </p>
            </div>
            <div>
              <h3 className="text-gray-900 mb-2">Real-Time Analysis</h3>
              <p className="text-gray-600 text-sm">
                Get instant verification results.
              </p>
            </div>
          </div>

          <div className="text-gray-500 text-sm">
            © All rights reserved by{" "}
            <span className="font-semibold text-gray-900">Vocal Guard</span>
          </div>
        </div>

        <div className="flex-1 relative">
          <div className="bg-gradient-to-br from-pink-100 to-pink-50 rounded-3xl p-8 relative min-h-[600px]">
            <div className="bg-white rounded-3xl p-4 mb-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <span className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                  ▶
                </span>
                <span className="text-gray-600">0:15</span>
              </div>
              <div className="text-xl">❤️</div>
            </div>

            <div className="bg-white rounded-3xl p-4 mb-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <span className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                  ▶
                </span>
                <div className="w-[150px] h-[30px] bg-gradient-to-r from-purple-600 to-indigo-800 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.2)_0px,rgba(255,255,255,0.2)_2px,transparent_2px,transparent_4px)]"></div>
                </div>
                <span className="text-gray-600">0:15</span>
              </div>
              <div className="text-xl">❤️</div>
            </div>

            <div className="flex flex-wrap gap-2 my-8">
              <span className="bg-white px-4 py-2 rounded-full text-sm shadow-sm">
                Max McKinney 🎧
              </span>
              <span className="bg-white px-4 py-2 rounded-full text-sm shadow-sm">
                John Smith 🎧
              </span>
              <span className="bg-white px-4 py-2 rounded-full text-sm shadow-sm">
                Rohit Chouhan 🎧
              </span>
            </div>

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full mb-4">
                <span>🎤</span>
                Recording
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between mb-4">
                  <span className="text-gray-700">Voice memo</span>
                  <span className="cursor-pointer text-xl">×</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-red-500">⬤</div>
                  <div className="flex-1 h-5 bg-gray-100 rounded-xl"></div>
                  <span className="text-gray-600">0:11/0:30</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 text-4xl rotate-[-15deg]">
              👍
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
