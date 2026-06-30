'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Globe, 
  Folder, 
  Languages, 
  Search, 
  Plus, 
  LogOut, 
  Check, 
  AlertCircle, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  SlidersHorizontal,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { TranslationsGridItem, Language, Project } from '@translation-platform/shared';

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'translations' | 'languages' | 'projects'>('translations');
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [gridData, setGridData] = useState<TranslationsGridItem[]>([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [gridLoading, setGridLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing' | 'outdated' | 'ai'>('all');
  
  // Form States
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newLangCode, setNewLangCode] = useState<string>('');
  const [newLangName, setNewLangName] = useState<string>('');
  
  // Inline Editing UI feedback
  const [savingCells, setSavingCells] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  
  // Copy API Key state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  // Update Project AI settings
  const handleUpdateProjectAi = async (projectId: string, aiEnabled: boolean, aiProvider: string) => {
    try {
      const res = await fetchWithAuth(`http://localhost:3001/v1/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiEnabled, aiProvider }),
      });
      if (!res.ok) throw new Error('Failed to update project settings');
      const updated = await res.json();
      setProjects(projects.map(p => p.id === projectId ? updated : p));
      if (selectedProject?.id === projectId) {
        setSelectedProject(updated);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Verify an AI translation
  const handleVerifyTranslation = async (keyId: string, languageCode: string, value: string) => {
    const cellKey = `${keyId}-${languageCode}`;
    setSavingCells(prev => ({ ...prev, [cellKey]: 'saving' }));
    try {
      const res = await fetchWithAuth('http://localhost:3001/v1/translations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId,
          languageCode,
          translatedValue: value,
          status: 'TRANSLATED',
        }),
      });

      if (!res.ok) throw new Error('Failed to verify translation');

      // Update local grid state
      setGridData(prevGrid => prevGrid.map(item => {
        if (item.id === keyId) {
          return {
            ...item,
            translations: {
              ...item.translations,
              [languageCode]: {
                id: item.translations[languageCode]?.id || '',
                translatedValue: value,
                status: 'TRANSLATED',
              }
            }
          };
        }
        return item;
      }));

      setSavingCells(prev => ({ ...prev, [cellKey]: 'saved' }));
      setTimeout(() => {
        setSavingCells(prev => {
          const next = { ...prev };
          delete next[cellKey];
          return next;
        });
      }, 1500);
    } catch (err) {
      setSavingCells(prev => ({ ...prev, [cellKey]: 'error' }));
    }
  };

  // Fetch helpers
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const currentToken = localStorage.getItem('translation_admin_token');
    if (!currentToken) {
      router.push('/login');
      throw new Error('Not authenticated');
    }
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${currentToken}`,
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      localStorage.removeItem('translation_admin_token');
      router.push('/login');
      throw new Error('Session expired');
    }
    
    return response;
  }, [router]);

  // Load initial configurations (projects and languages)
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Languages
      const langRes = await fetch('http://localhost:3001/v1/languages');
      if (!langRes.ok) throw new Error('Failed to fetch languages');
      const langData = await langRes.json();
      setLanguages(langData);

      // Fetch Projects
      const projRes = await fetchWithAuth('http://localhost:3001/v1/projects');
      if (!projRes.ok) throw new Error('Failed to fetch projects');
      const projData = await projRes.json();
      setProjects(projData);

      if (projData.length > 0) {
        setSelectedProject(projData[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // Check auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('translation_admin_token');
    const storedEmail = localStorage.getItem('translation_admin_email');
    if (!storedToken) {
      router.push('/login');
    } else {
      setToken(storedToken);
      setAdminEmail(storedEmail || 'Admin');
      loadInitialData();
    }
  }, [router, loadInitialData]);

  // Fetch translation grid when project changes
  const loadTranslationGrid = useCallback(async (projectId: string) => {
    setGridLoading(true);
    try {
      const res = await fetchWithAuth(`http://localhost:3001/v1/translations/grid/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch translations grid');
      const data = await res.json();
      setGridData(data);
    } catch (err: any) {
      setError(err.message || 'Error loading translations grid');
    } finally {
      setGridLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (selectedProject) {
      loadTranslationGrid(selectedProject.id);
    }
  }, [selectedProject, loadTranslationGrid]);

  // Log out
  const handleLogout = () => {
    localStorage.removeItem('translation_admin_token');
    localStorage.removeItem('translation_admin_email');
    router.push('/login');
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setActionLoading('project');
    try {
      const res = await fetchWithAuth('http://localhost:3001/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create project');
      }
      const newProj = await res.json();
      setProjects([newProj, ...projects]);
      setSelectedProject(newProj);
      setNewProjectName('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Add Language
  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLangCode.trim() || !newLangName.trim()) return;
    setActionLoading('language');
    try {
      const res = await fetchWithAuth('http://localhost:3001/v1/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newLangCode.trim().toLowerCase(), name: newLangName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add language');
      }
      const newLang = await res.json();
      setLanguages([...languages, newLang]);
      setNewLangCode('');
      setNewLangName('');
      if (selectedProject) {
        loadTranslationGrid(selectedProject.id);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Language Enable/Disable
  const handleToggleLanguage = async (code: string, currentEnabled: boolean) => {
    try {
      const res = await fetchWithAuth(`http://localhost:3001/v1/languages/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (!res.ok) throw new Error('Failed to update language');
      
      setLanguages(languages.map(lang => 
        lang.code === code ? { ...lang, enabled: !currentEnabled } : lang
      ));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Inline edit translation cell
  const handleCellBlur = async (
    keyId: string, 
    languageCode: string, 
    originalValue: string, 
    newValue: string
  ) => {
    if (newValue === originalValue) return; // No change

    const cellKey = `${keyId}-${languageCode}`;
    setSavingCells(prev => ({ ...prev, [cellKey]: 'saving' }));

    try {
      const res = await fetchWithAuth('http://localhost:3001/v1/translations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId,
          languageCode,
          translatedValue: newValue,
          status: 'TRANSLATED',
        }),
      });

      if (!res.ok) throw new Error('Failed to save translation');

      // Update local grid state
      setGridData(prevGrid => prevGrid.map(item => {
        if (item.id === keyId) {
          return {
            ...item,
            translations: {
              ...item.translations,
              [languageCode]: {
                id: item.translations[languageCode]?.id || '',
                translatedValue: newValue,
                status: 'TRANSLATED',
              }
            }
          };
        }
        return item;
      }));

      setSavingCells(prev => ({ ...prev, [cellKey]: 'saved' }));
      setTimeout(() => {
        setSavingCells(prev => {
          const next = { ...prev };
          delete next[cellKey];
          return next;
        });
      }, 1500);
    } catch (err) {
      setSavingCells(prev => ({ ...prev, [cellKey]: 'error' }));
    }
  };

  // Copy API key helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle API key visibility
  const toggleRevealKey = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter grid data
  const filteredGridData = gridData.filter(item => {
    // 1. Search Query
    const matchesSearch = 
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.defaultValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.values(item.translations).some(t => t.translatedValue.toLowerCase().includes(searchQuery.toLowerCase()));
      
    if (!matchesSearch) return false;

    // 2. Status Filter
    if (statusFilter === 'missing') {
      // Show if any enabled language has a missing status or no translation record
      return languages.some(lang => {
        if (!lang.enabled) return false;
        const trans = item.translations[lang.code];
        return !trans || trans.status === 'MISSING' || !trans.translatedValue;
      });
    }

    if (statusFilter === 'outdated') {
      return Object.values(item.translations).some(t => t.status === 'OUTDATED');
    }

    if (statusFilter === 'ai') {
      return Object.values(item.translations).some(t => t.status === 'AI_TRANSLATED');
    }

    return true;
  });

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-[#060814] flex items-center justify-center text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
          <p className="text-sm text-slate-400">Initializing Translation Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060814] flex text-slate-100 overflow-hidden h-screen">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-900/80 bg-[#080c16] flex flex-col justify-between p-6 shrink-0 z-10">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/10 rounded-xl border border-brand-500/20 flex items-center justify-center text-brand-500 shadow-[0_0_12px_rgba(37,99,235,0.1)]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-200 leading-tight">Translate</h2>
              <span className="text-[10px] text-brand-500 font-semibold tracking-wider uppercase">Platform</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('translations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'translations'
                  ? 'bg-brand-600/15 border border-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Languages className="w-4 h-4" />
              Translations Grid
            </button>
            <button
              onClick={() => setActiveTab('languages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'languages'
                  ? 'bg-brand-600/15 border border-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Globe className="w-4 h-4" />
              Languages
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-brand-600/15 border border-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Folder className="w-4 h-4" />
              Projects
            </button>
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="space-y-4 pt-4 border-t border-slate-900/60">
          <div className="px-2">
            <p className="text-xs text-slate-500">Logged in as</p>
            <p className="text-sm font-medium text-slate-300 truncate">{adminEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/10 hover:text-red-300 border border-transparent transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#060814] relative h-full">
        {/* Background radial glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-600/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <header className="h-16 border-b border-slate-900/80 flex items-center justify-between px-8 z-10 bg-[#080c16]/30 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-100 capitalize">
              {activeTab === 'translations' ? 'Translations Manager' : activeTab}
            </h1>
            {activeTab === 'translations' && projects.length > 0 && (
              <div className="relative">
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const p = projects.find(proj => proj.id === e.target.value);
                    if (p) setSelectedProject(p);
                  }}
                  className="bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs outline-none focus:border-brand-500/50 cursor-pointer"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'translations' && selectedProject && (
              <button
                onClick={() => loadTranslationGrid(selectedProject.id)}
                disabled={gridLoading}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Refresh Grid"
              >
                <RefreshCw className={`w-4 h-4 ${gridLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </header>

        {/* CONTENT CONTENT CONTAINER */}
        <div className="flex-1 overflow-auto p-8 relative min-h-0">
          
          {/* TAB: TRANSLATIONS GRID */}
          {activeTab === 'translations' && (
            <div className="h-full flex flex-col space-y-6">
              
              {/* Search, Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-950/30 p-4 rounded-xl border border-slate-900/60 shrink-0">
                <div className="relative w-full sm:w-80">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search keys or values..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-200 placeholder-slate-500 outline-none focus:border-brand-500/50 text-sm transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0 mr-2">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filter:
                  </span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-brand-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.2)]'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-850'
                    }`}
                  >
                    All Keys
                  </button>
                  <button
                    onClick={() => setStatusFilter('missing')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      statusFilter === 'missing'
                        ? 'bg-red-600/90 text-white shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-850'
                    }`}
                  >
                    Missing Translations
                  </button>
                  <button
                    onClick={() => setStatusFilter('outdated')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      statusFilter === 'outdated'
                        ? 'bg-yellow-600/90 text-white shadow-[0_0_10px_rgba(202,138,4,0.2)]'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-850'
                    }`}
                  >
                    Outdated
                  </button>
                  <button
                    onClick={() => setStatusFilter('ai')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      statusFilter === 'ai'
                        ? 'bg-purple-600/95 text-white shadow-[0_0_10px_rgba(147,51,234,0.25)]'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-850'
                    }`}
                  >
                    AI Generated
                  </button>
                </div>
              </div>

              {/* Translation Grid */}
              <div className="flex-1 border border-slate-900/80 rounded-xl overflow-hidden bg-slate-950/20 flex flex-col min-h-0">
                {gridLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    <p className="text-sm">Loading translations grid...</p>
                  </div>
                ) : filteredGridData.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                    <AlertCircle className="w-12 h-12 mb-3 text-slate-600" />
                    <p className="text-base font-medium text-slate-400">No translations found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery ? 'Try adjusting your search query or filters' : 'Integrate the SDK to register keys automatically'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-left text-sm table-fixed">
                      <thead className="bg-[#0b101d] text-xs uppercase text-slate-400 border-b border-slate-900 sticky top-0 z-20">
                        <tr>
                          <th className="p-4 font-semibold border-r border-slate-900 w-72">Key Name</th>
                          <th className="p-4 font-semibold border-r border-slate-900 w-80">English (Fallback)</th>
                          
                          {languages.filter(l => l.enabled && l.code !== 'en').map((lang) => (
                            <th key={lang.code} className="p-4 font-semibold border-r border-slate-900 w-80">
                              {lang.name} ({lang.code.toUpperCase()})
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60">
                        {filteredGridData.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                            
                            {/* Key Cell */}
                            <td className="p-4 border-r border-slate-900 align-top">
                              <span className="font-mono text-xs text-blue-400 block break-words select-all">
                                {item.key}
                              </span>
                              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-1 block">
                                Namespace: {item.namespace}
                              </span>
                            </td>

                            {/* Default English Cell */}
                            <td className="p-4 border-r border-slate-900 align-top">
                              <textarea
                                className="w-full bg-transparent border border-transparent hover:border-slate-800 focus:border-brand-500/50 focus:bg-slate-900/40 p-2 rounded-lg resize-none text-xs outline-none text-slate-200 transition-all min-h-[60px]"
                                defaultValue={item.defaultValue}
                                onBlur={(e) => handleCellBlur(item.id, 'en', item.defaultValue, e.target.value)}
                              />
                            </td>

                            {/* Translated Languages Cells */}
                            {languages.filter(l => l.enabled && l.code !== 'en').map((lang) => {
                              const trans = item.translations[lang.code];
                              const val = trans?.translatedValue || '';
                              const status = trans?.status || 'MISSING';
                              const cellKey = `${item.id}-${lang.code}`;
                              const cellState = savingCells[cellKey];

                              return (
                                <td 
                                  key={lang.code} 
                                  className={`p-4 border-r border-slate-900 align-top transition-all duration-350 relative ${
                                    cellState === 'saved' ? 'bg-emerald-950/10' : ''
                                  } ${cellState === 'error' ? 'bg-red-950/15' : ''}`}
                                >
                                  <textarea
                                    className={`w-full bg-transparent border p-2 rounded-lg resize-none text-xs outline-none text-slate-200 transition-all min-h-[60px] ${
                                      status === 'MISSING' || !val
                                        ? 'border-red-900/30 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20'
                                        : 'border-transparent hover:border-slate-800 focus:border-brand-500/50'
                                    }`}
                                    placeholder="Translate..."
                                    defaultValue={val}
                                    onBlur={(e) => handleCellBlur(item.id, lang.code, val, e.target.value)}
                                  />

                                  {/* Status Indicators */}
                                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                    {cellState === 'saving' && (
                                      <Loader2 className="w-3 h-3 text-brand-500 animate-spin" />
                                    )}
                                    {cellState === 'saved' && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    )}
                                    {cellState === 'error' && (
                                      <AlertCircle className="w-3.5 h-3.5 text-red-400" title="Failed to save" />
                                    )}
                                    {!cellState && (status === 'MISSING' || !val) && (
                                      <span className="text-[9px] bg-red-500/10 border border-red-500/25 text-red-400 px-1.5 py-0.5 rounded-full font-medium">
                                        Missing
                                      </span>
                                    )}
                                    {!cellState && status === 'AI_TRANSLATED' && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] bg-purple-500/10 border border-purple-500/25 text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
                                          AI
                                        </span>
                                        <button
                                          onClick={() => handleVerifyTranslation(item.id, lang.code, val)}
                                          className="p-1 rounded bg-slate-950 hover:bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-slate-800 transition-all cursor-pointer"
                                          title="Verify AI Translation"
                                        >
                                          <Check className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: LANGUAGES */}
          {activeTab === 'languages' && (
            <div className="max-w-4xl space-y-8">
              
              {/* Add Language Form */}
              <div className="glass p-6 rounded-2xl border border-slate-900/60">
                <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-500" />
                  Add New Language
                </h3>
                <form onSubmit={handleAddLanguage} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Language Code</label>
                    <input
                      type="text"
                      placeholder="e.g. de, fr, es"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-brand-500/50 outline-none text-sm text-slate-200"
                      value={newLangCode}
                      onChange={(e) => setNewLangCode(e.target.value)}
                    />
                  </div>
                  <div className="flex-2 space-y-2 w-full sm:w-auto">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Language Name</label>
                    <input
                      type="text"
                      placeholder="e.g. German, French, Spanish"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-brand-500/50 outline-none text-sm text-slate-200"
                      value={newLangName}
                      onChange={(e) => setNewLangName(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading === 'language'}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 active:scale-98 rounded-xl text-sm font-medium text-white shadow-lg shadow-brand-600/15 transition-all flex items-center gap-2 cursor-pointer h-[42px]"
                  >
                    {actionLoading === 'language' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add Language'
                    )}
                  </button>
                </form>
              </div>

              {/* Languages List */}
              <div className="glass rounded-2xl border border-slate-900/60 overflow-hidden">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#0b101d] text-xs uppercase text-slate-400 border-b border-slate-900">
                    <tr>
                      <th className="p-4 font-semibold">Language Code</th>
                      <th className="p-4 font-semibold">Name</th>
                      <th className="p-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {languages.map((lang) => (
                      <tr key={lang.code} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 font-mono text-brand-400 text-xs font-semibold uppercase">{lang.code}</td>
                        <td className="p-4 font-medium text-slate-200">{lang.name}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleLanguage(lang.code, lang.enabled)}
                            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border ${
                              lang.enabled
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {lang.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="max-w-4xl space-y-8">
              
              {/* Create Project Form */}
              <div className="glass p-6 rounded-2xl border border-slate-900/60">
                <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-500" />
                  Create New Project
                </h3>
                <form onSubmit={handleCreateProject} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Project Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Klarwein, VetAI"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-brand-500/50 outline-none text-sm text-slate-200"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading === 'project'}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 active:scale-98 rounded-xl text-sm font-medium text-white shadow-lg shadow-brand-600/15 transition-all flex items-center gap-2 cursor-pointer h-[42px]"
                  >
                    {actionLoading === 'project' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Create Project'
                    )}
                  </button>
                </form>
              </div>

              {/* Projects List */}
              <div className="grid gap-4">
                {projects.map((proj) => {
                  const isRevealed = revealedKeys[proj.id];
                  const isCopied = copiedKey === proj.id;

                  return (
                    <div key={proj.id} className="glass p-6 rounded-2xl border border-slate-900/60 flex items-center justify-between gap-4 hover:border-slate-800 transition-all">
                      <div className="space-y-2 min-w-0">
                        <h4 className="text-base font-bold text-slate-100">{proj.name}</h4>
                        <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-900/50 w-fit max-w-full">
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase select-none tracking-wider shrink-0 pl-1">API Key</span>
                          <span className="font-mono text-xs text-slate-300 truncate px-2 select-all min-w-[240px]">
                            {isRevealed ? proj.apiKey : '••••••••••••••••••••••••••••••••'}
                          </span>
                        </div>

                        {/* AI Translation Settings */}
                        <div className="mt-4 pt-4 border-t border-slate-900/40 flex flex-wrap gap-4 items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`ai-enabled-${proj.id}`}
                              checked={proj.aiEnabled}
                              onChange={(e) => handleUpdateProjectAi(proj.id, e.target.checked, proj.aiProvider)}
                              className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-brand-600 focus:ring-brand-500/30 accent-brand-500 cursor-pointer"
                            />
                            <label htmlFor={`ai-enabled-${proj.id}`} className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                              AI Auto-Translation
                            </label>
                          </div>

                          {proj.aiEnabled && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Provider:</span>
                              <select
                                value={proj.aiProvider}
                                onChange={(e) => handleUpdateProjectAi(proj.id, proj.aiEnabled, e.target.value)}
                                className="bg-slate-900 border border-slate-800 text-slate-350 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-brand-500/50 cursor-pointer"
                              >
                                <option value="gemini">Gemini (1.5 Flash)</option>
                                <option value="openai">OpenAI (GPT-4o Mini)</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Reveal Button */}
                        <button
                          onClick={() => toggleRevealKey(proj.id)}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-slate-200 text-slate-400 cursor-pointer transition-all active:scale-95"
                          title={isRevealed ? 'Hide API Key' : 'Reveal API Key'}
                        >
                          {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        {/* Copy Button */}
                        <button
                          onClick={() => copyToClipboard(proj.apiKey, proj.id)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${
                            isCopied 
                              ? 'bg-emerald-950/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Copy API Key"
                        >
                          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
