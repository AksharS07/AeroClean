import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { SurveyDetail } from '../types';
import { Activity, ShieldCheck, MapPin, Award, FileImage, Trash2 } from 'lucide-react';

interface StatsDashboardProps {
  survey: SurveyDetail | null;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ survey }) => {
  if (!survey) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-gray-800">
        <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-white mb-1">No Active Survey Selected</h3>
        <p className="text-gray-400 text-xs">Upload a drone survey or select one from history to view analytics.</p>
      </div>
    );
  }

  // Aggregate category counts from image detections
  const categoryCounts: { [key: string]: number } = {};
  survey.images.forEach((img) => {
    img.detections.forEach((det) => {
      categoryCounts[det.label] = (categoryCounts[det.label] || 0) + 1;
    });
  });

  const categoryData = Object.keys(categoryCounts).map((cat) => ({
    name: cat,
    count: categoryCounts[cat],
  }));

  // Aggregate severity breakdown
  let cleanCount = 0, moderateCount = 0, highCount = 0, criticalCount = 0;
  survey.images.forEach((img) => {
    if (img.garbage_index <= 25) cleanCount++;
    else if (img.garbage_index <= 50) moderateCount++;
    else if (img.garbage_index <= 75) highCount++;
    else criticalCount++;
  });

  const severityData = [
    { name: 'Clean (0-25)', value: cleanCount, color: '#10b981' },
    { name: 'Moderate (26-50)', value: moderateCount, color: '#f59e0b' },
    { name: 'High (51-75)', value: highCount, color: '#f97316' },
    { name: 'Critical (76-100)', value: criticalCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const getCleanlinessStatus = (avgGi: number) => {
    if (avgGi <= 25) return { text: 'Pristine Clean', color: 'text-emerald-400' };
    if (avgGi <= 50) return { text: 'Moderate Litter', color: 'text-amber-400' };
    if (avgGi <= 75) return { text: 'High Pollution', color: 'text-orange-400' };
    return { text: 'Severe Hotspot Zone', color: 'text-red-400' };
  };

  const status = getCleanlinessStatus(survey.average_garbage_index);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Average Garbage Index</span>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{survey.average_garbage_index} <span className="text-xs text-gray-500 font-normal">/ 100</span></div>
          <p className={`text-xs font-semibold mt-1 ${status.color}`}>{status.text}</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Total Detected Litter</span>
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{survey.total_garbage_count}</div>
          <p className="text-xs text-gray-500 mt-1">Across {survey.total_images} drone capture frames</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Surveyed Area</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{survey.area_surveyed_sqm} <span className="text-xs text-gray-500 font-normal">m²</span></div>
          <p className="text-xs text-gray-500 mt-1">Spatial Grid Binning Applied</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Hotspots Identified</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{survey.hotspots.length}</div>
          <p className="text-xs text-gray-500 mt-1">Priority municipal cleanup targets</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-blue-400" /> Waste Type Category Distribution
          </h3>
          <div className="h-[260px] w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#06b6d4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">No trash detections recorded</div>
            )}
          </div>
        </div>

        {/* Severity Distribution Pie Chart */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" /> Cleanliness Severity Spread
          </h3>
          <div className="h-[260px] w-full">
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">No severity distribution data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
