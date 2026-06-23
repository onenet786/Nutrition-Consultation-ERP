/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Play, Pause, Volume2, Users, Soup, ChefHat, 
  Truck, Wallet, HelpCircle, CheckCircle, ChevronRight, Video, X, RotateCcw,
  Sparkles, ShieldCheck
} from 'lucide-react';

interface TutorialVideo {
  title: string;
  description: string;
  duration: number; // in seconds
  type: string;
  category: string;
  subtitles: { time: number; text: string }[];
  visualMock: string; // Describes which mockup scene to display
}

export default function UserGuideTab() {
  const [activeSection, setActiveSection] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const playTimer = useRef<NodeJS.Timeout | null>(null);

  const tutorialVideos: TutorialVideo[] = [
    {
      title: '1. Administrator & Owner Operations Tutorial',
      description: 'Learn how to read high-level stats, monitor cost transactions, and check security audit logs.',
      duration: 16,
      type: 'Video & Voice Guide',
      category: 'admin',
      visualMock: 'admin_dashboard',
      subtitles: [
        { time: 0, text: 'Welcome to the Owner and Administrator console walkthrough.' },
        { time: 4, text: 'This portal monitors high-level statistics like active patients, kitchen backlogs, and dispatches.' },
        { time: 8, text: 'You can review operating expenses and access full database audit logs from the sidebar.' },
        { time: 12, text: 'Use the Host Center to perform database state backups and restore JSON dumps.' }
      ]
    },
    {
      title: '2. Clinical Nutritionist Patient Portal & Plan Builder',
      description: 'Learn how to register patients, record consultation vitals, and design custom meal plans.',
      duration: 16,
      type: 'Video & Voice Guide',
      category: 'nutritionist',
      visualMock: 'nutritionist_portal',
      subtitles: [
        { time: 0, text: 'Welcome to the Clinical Portal walkthrough for nutritionists.' },
        { time: 4, text: 'To register a patient, click the Patients module and enter their vitals (weight, height, CNIC).' },
        { time: 8, text: 'The system automatically computes patient BMI and checks for dietary allergen risks.' },
        { time: 12, text: 'You can compile custom recipes and assign them to meal plan calendars in a single click.' }
      ]
    },
    {
      title: '3. Kitchen Production & Packaging Label Guide',
      description: 'Walkthrough for chefs to check pending meal prep batches, manage cooking steps, and print labels.',
      duration: 16,
      type: 'Video & Voice Guide',
      category: 'kitchen',
      visualMock: 'kitchen_queue',
      subtitles: [
        { time: 0, text: 'Welcome to the Kitchen Production and packaging walkthrough.' },
        { time: 4, text: 'Chefs use this queue to see meal batches required for the breakfast, lunch, and dinner cycles.' },
        { time: 8, text: 'Click status dropdowns to update progress from Pending to Cooking, Completed, or Ready.' },
        { time: 12, text: 'The label generator dynamically creates barcode tags warning about patient allergens.' }
      ]
    },
    {
      title: '4. Logistics Dispatch & Field Rider Delivery Guide',
      description: 'Instructions for dispatchers to configure rider routes and for riders to verify dispatches via OTP.',
      duration: 16,
      type: 'Video & Voice Guide',
      category: 'logistics',
      visualMock: 'rider_dispatches',
      subtitles: [
        { time: 0, text: 'Welcome to the Logistics, Route Hub, and Rider walkthrough.' },
        { time: 4, text: 'Here you can coordinate dispatches, assign riders, and optimize morning or evening routes.' },
        { time: 8, text: 'Once in the field, riders confirm deliveries by requesting the secure OTP from the patient.' },
        { time: 12, text: 'Validating the OTP automatically saves delivery timestamps and GPS location records.' }
      ]
    }
  ];

  const modulesHelp = [
    {
      id: 'patients',
      title: 'Patients & Clinical Vitals',
      icon: <Users className="h-5 w-5 text-emerald-600" />,
      steps: [
        'Navigate to the Patients & Diagnosis module.',
        'Click the "+ Add New Patient" form to register a new file.',
        'Record details such as height, weight, CNIC, mobile, and food restrictions.',
        'Enter patient consultation notes to track weight shifts and dynamically recalculate BMI.'
      ]
    },
    {
      id: 'meal-planning',
      title: 'Meal Planning & Recipe Library',
      icon: <Soup className="h-5 w-5 text-emerald-600" />,
      steps: [
        'Browse recipes under the "Meal Planner & Recipes" module.',
        'Select a recipe (e.g. Grilled Salmon) and set a time-slot (Breakfast, Lunch, Dinner).',
        'Assign the plan. The system will automatically calculate ingredients and subtract raw stock from the Active Inventory.',
        'Assigned plans automatically push tickets into the Kitchen Production queue.'
      ]
    },
    {
      id: 'kitchen',
      title: 'Kitchen & Meal Batching',
      icon: <ChefHat className="h-5 w-5 text-emerald-600" />,
      steps: [
        'Chefs view pending batches under the "Kitchen Production" tab.',
        'Update status states from "Pending" -> "Cooking" -> "Completed" -> "Packed".',
        'Use the built-in Barcode Label Generator to inspect box warning details (e.g., Allergen alerts).'
      ]
    },
    {
      id: 'logistics',
      title: 'Logistics, Routes & Dispatches',
      icon: <Truck className="h-5 w-5 text-emerald-600" />,
      steps: [
        'Dispatchers monitor active deliveries and routes under "Logistics & Route Hub".',
        'Field riders review their dispatches list.',
        'Once a rider hands over the meal box, they click "Confirm Delivery via OTP" to verify receipt, matching the GPS coordinates.'
      ]
    },
    {
      id: 'expenses',
      title: 'Finances & Expense Recording',
      icon: <Wallet className="h-5 w-5 text-emerald-600" />,
      steps: [
        'Track ingredient purchases, fuel claims, and kitchen rents.',
        'Use the "Record Cost Transaction" form to enter payments.',
        'Monitor costs to compute correct gross profits.'
      ]
    }
  ];

  // Sync simulated playback timer loop
  useEffect(() => {
    if (isPlaying && selectedVideo) {
      playTimer.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= selectedVideo.duration) {
            setIsPlaying(false);
            if (playTimer.current) clearInterval(playTimer.current);
            return selectedVideo.duration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (playTimer.current) {
        clearInterval(playTimer.current);
      }
    }
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [isPlaying, selectedVideo]);

  const handlePlayVideo = (video: TutorialVideo) => {
    setSelectedVideo(video);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
    setSelectedVideo(null);
    setCurrentTime(0);
  };

  // Find active subtitle matching currentTime
  const getActiveSubtitle = () => {
    if (!selectedVideo) return '';
    let text = '';
    for (const sub of selectedVideo.subtitles) {
      if (currentTime >= sub.time) {
        text = sub.text;
      }
    }
    return text;
  };

  // Format second representation
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="user-guide-tab" className="space-y-6">
      
      {/* Premium Gradient Header block */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-3xl p-8 shadow-xl border border-emerald-900/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30 uppercase tracking-wider">
            User Operations Center
          </span>
          <h2 className="text-3xl font-extrabold font-display tracking-tight text-white">
            Nutrition ERP User Setup & Tutorials
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome to the operational hub. This dashboard contains step-by-step guides, audio logs, and video walkthroughs designed to help team members (Chefs, Nutritionists, Riders, and Admins) handle and run the system efficiently.
          </p>
        </div>
      </div>

      {/* Video & Audio Tutorial Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">Video & Audio Training Vault</h3>
            <p className="text-xs text-gray-500">Interactive multimedia guides to train your staff on using the console</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeSection === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setActiveSection('clinical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeSection === 'clinical' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Clinical
            </button>
            <button
              onClick={() => setActiveSection('ops')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeSection === 'ops' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Kitchen & Logistics
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tutorialVideos
            .filter(v => {
              if (activeSection === 'clinical') return v.category === 'nutritionist' || v.category === 'admin';
              if (activeSection === 'ops') return v.category === 'kitchen' || v.category === 'logistics';
              return true;
            })
            .map((video, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg uppercase tracking-wide">
                      {video.type.includes('Voice') ? <Volume2 className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                      {video.type}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400">Duration: {formatTime(video.duration)}</span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">{video.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{video.description}</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handlePlayVideo(video)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-white" />
                    Play Training Walkthrough
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modules Action Guides Accordions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Module Setup & Workflow Guide
          </h3>
          <p className="text-xs text-gray-500">Step-by-step procedures for key business workflows inside the ERP application</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 border-t border-slate-100 pt-6">
          {modulesHelp.map((module, mIdx) => (
            <div key={module.id} className="lg:col-span-5 flex flex-col md:flex-row gap-4 items-start pb-6 border-b border-dashed border-slate-100 last:border-b-0 last:pb-0">
              
              {/* Module descriptor title */}
              <div className="md:w-1/4 flex items-center gap-2 shrink-0">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  {module.icon}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{module.title}</h4>
                  <span className="text-[10px] text-gray-400 font-mono">Module #{mIdx + 1} Workflow</span>
                </div>
              </div>

              {/* Steps list */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                {module.steps.map((step, sIdx) => (
                  <div key={sIdx} className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-1 relative">
                    <span className="absolute top-2 right-2.5 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Step {sIdx + 1}
                    </span>
                    <p className="text-xs text-slate-600 pt-3 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Support & Quick Contact section */}
      <div className="bg-emerald-950 text-white rounded-2xl p-6 border border-emerald-900 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-sm font-bold">Need Help or Customized Operations Setup?</h4>
          <p className="text-xs text-emerald-300">Our clinical support representatives are available to set up specific diets or assist with riders onboarding.</p>
        </div>
        <div className="shrink-0">
          <button
            onClick={() => alert('Opening consultation live desk chat...')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
          >
            Contact Operations Support
          </button>
        </div>
      </div>

      {/* CUSTOM SIMULATED VIDEO/VOICE PLAYER MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            
            {/* Header / Info bar */}
            <div className="p-4 bg-slate-900 border-b border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold tracking-wider font-mono text-emerald-400 uppercase">Live Training Simulator</span>
              </div>
              <button 
                onClick={handleClosePlayer} 
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Canvas Area */}
            <div className="aspect-video bg-slate-950 relative flex flex-col justify-center items-center overflow-hidden">
              
              {/* Visual scene mocks representing what would show in video */}
              {selectedVideo.visualMock === 'admin_dashboard' && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 animate-bounce">
                    <ShieldCheck className="h-12 w-12" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-200">Simulated Screen: Admin Panel Vitals & Statistics</div>
                    <div className="text-xs text-slate-400">Showing active patients metrics, profit statement, and security key tokens.</div>
                  </div>
                  {/* Mock dashboard card values animating */}
                  <div className="flex gap-3 text-[10px] font-mono">
                    <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400">Patients Active: {2 + (currentTime % 2)}</div>
                    <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400">Total Expenses: Rs. 86,390</div>
                  </div>
                </div>
              )}

              {selectedVideo.visualMock === 'nutritionist_portal' && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 animate-pulse">
                    <Users className="h-12 w-12" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-200">Simulated Screen: Plan Builder & Consultation Vitals</div>
                    <div className="text-xs text-slate-400">Nutritionists view CNIC database, register diagnostics, and drag-and-drop salmon/oat boxes.</div>
                  </div>
                  <div className="w-48 bg-slate-900 border border-slate-800 rounded-lg p-2 text-left font-mono text-[8px] space-y-1 text-slate-400">
                    <div className="text-emerald-400 font-bold border-b border-slate-800 pb-1">Patient File: Ayesha Khan</div>
                    <div>Height: 165 cm | Weight: 84.5 kg</div>
                    <div>Computed BMI: <span className="text-red-400 font-bold">31.0 (Obese)</span></div>
                  </div>
                </div>
              )}

              {selectedVideo.visualMock === 'kitchen_queue' && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 animate-spin" style={{ animationDuration: '6s' }}>
                    <ChefHat className="h-12 w-12" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-200">Simulated Screen: Kitchen Queue & Status Controllers</div>
                    <div className="text-xs text-slate-400">Chef updates cooking stages, generates barcoded tags, and triggers allergen warnings.</div>
                  </div>
                  <div className="w-56 bg-slate-900 border border-slate-800 rounded-lg p-2 flex justify-between items-center font-mono text-[8px]">
                    <div className="text-slate-300">k-1 Breakfast porridge</div>
                    <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded uppercase font-bold animate-pulse">Cooking</span>
                  </div>
                </div>
              )}

              {selectedVideo.visualMock === 'rider_dispatches' && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                    <Truck className="h-12 w-12 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-200">Simulated Screen: Rider Delivery & OTP Verification</div>
                    <div className="text-xs text-slate-400">Riders view routes and input patient OTP checkouts to save delivery location logs.</div>
                  </div>
                  <div className="px-4 py-2 bg-slate-900 border border-slate-850 rounded-xl flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400">Enter OTP Code:</span>
                    <span className="font-mono text-xs text-emerald-400 tracking-widest font-bold">88**</span>
                  </div>
                </div>
              )}

              {/* Bouncing Audio Waveform overlay */}
              {isPlaying && (
                <div className="absolute top-4 right-4 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 backdrop-blur-sm">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-0.5 bg-emerald-400 rounded animate-[pulse_0.6s_infinite]" style={{ height: '70%' }}></div>
                    <div className="w-0.5 bg-emerald-400 rounded animate-[pulse_0.4s_infinite]" style={{ height: '90%' }}></div>
                    <div className="w-0.5 bg-emerald-400 rounded animate-[pulse_0.5s_infinite]" style={{ height: '40%' }}></div>
                    <div className="w-0.5 bg-emerald-400 rounded animate-[pulse_0.7s_infinite]" style={{ height: '80%' }}></div>
                  </div>
                </div>
              )}

              {/* Subtitles Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 border border-slate-800 text-slate-100 px-4 py-2.5 rounded-2xl text-center text-xs backdrop-blur-sm leading-relaxed">
                {getActiveSubtitle() || 'Audio playback started...'}
              </div>
            </div>

            {/* Video Controls Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-850 flex flex-col gap-3">
              
              {/* Progress Slider */}
              <div 
                className="w-full h-1.5 bg-slate-800 hover:bg-slate-700 rounded-full cursor-pointer relative transition"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const fraction = (e.clientX - rect.left) / rect.width;
                  setCurrentTime(Math.floor(fraction * selectedVideo.duration));
                }}
              >
                <div 
                  className="h-full bg-emerald-500 rounded-full relative" 
                  style={{ width: `${(currentTime / selectedVideo.duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-emerald-500 rounded-full shadow"></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-full transition cursor-pointer"
                  >
                    {isPlaying ? <Pause className="h-4 w-4 fill-slate-950 text-slate-950" /> : <Play className="h-4 w-4 fill-slate-950 text-slate-950" />}
                  </button>
                  <button
                    onClick={() => { setCurrentTime(0); setIsPlaying(true); }}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                    title="Restart"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    {formatTime(currentTime)} / {formatTime(selectedVideo.duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4" />
                    <div className="w-16 h-1 bg-slate-800 rounded-full relative">
                      <div className="absolute left-0 top-0 h-full w-4/5 bg-slate-400 rounded-full"></div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-slate-850 px-2 py-1 rounded border border-slate-800 text-slate-400">Voice On</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
