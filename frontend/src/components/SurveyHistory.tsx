import React from 'react';
import { SurveySummary } from '../types';
import { History, Calendar, FileImage, Trash2, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { surveyApi } from '../services/api';

interface SurveyHistoryProps {
  surveys: SurveySummary[];
  activeSurveyId: string | null;
  onSelectSurvey: (surveyId: string) => void;
  onRefreshHistory: () => void;
}

export const SurveyHistory: React.FC<SurveyHistoryProps> = ({
  surveys,
  activeSurveyId,
  onSelectSurvey,
  onRefreshHistory,
}) => {
  const handleDelete = async (e: React.MouseEvent, surveyId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this survey record?')) {
      try {
        await surveyApi.deleteSurvey(surveyId);
        onRefreshHistory();
      } catch (err) {
        alert('Failed to delete survey record.');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    }
    if (status === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Loader2 className="w-3 h-3 animate-spin" /> Processing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertCircle className="w-3 h-3" /> Failed
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Aerial Survey Missions Log</h2>
        </div>
        <button
          onClick={onRefreshHistory}
          className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
        >
          Refresh List
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-gray-800">
          <History className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-300">No past survey missions recorded yet</p>
          <p className="text-xs text-gray-500 mt-1">Upload a batch of drone photos to create your first mission.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {surveys.map((s) => {
            const isSelected = s.id === activeSurveyId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSurvey(s.id)}
                className={`glass-card p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-500/10'
                    : 'border-gray-800/80 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-blue-400">
                    <FileImage className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{s.title}</h3>
                      {getStatusBadge(s.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>Images: <strong>{s.total_images}</strong></span>
                      <span>Total Litter: <strong>{s.total_garbage_count}</strong></span>
                      <span>Avg GI: <strong className="text-blue-400">{s.average_garbage_index}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition"
                    title="Delete survey"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-2 text-gray-400 hover:text-white">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
