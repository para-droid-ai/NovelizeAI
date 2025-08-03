
import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { NovelProject, SystemLogEntry } from '../types';
import { formatDuration, formatDurationShort } from '../src/utils/timeUtils';
import Button from './Button';

interface SystemLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: NovelProject | null;
}

const getModelShortName = (modelId?: string): string => {
  if (!modelId) return '-';
  if (modelId.includes('flash-lite')) return 'Flash Lite';
  if (modelId.includes('flash')) return 'Flash';
  if (modelId.includes('pro')) return 'Pro';
  const parts = modelId.split('-');
  if (parts.length > 2) return parts.slice(0,3).join('-');
  return 'Custom';
};

const SystemLogModal: React.FC<SystemLogModalProps> = ({ isOpen, onClose, project }) => {
  const [isLogVisible, setIsLogVisible] = useState(false);

  const stats = useMemo(() => {
    if (!project) return null;

    const initialPlanMs = project.initialAISetupPlan?.timing?.durationMs || 0;
    
    let totalPlanMs = 0;
    let totalProseMs = 0;
    let totalReviewMs = 0;
    let totalRevisionMs = 0;
    let planCount = 0;
    let proseCount = 0;
    let reviewCount = 0;
    let revisionCount = 0;

    const chapterMetrics = project.chapters.map(ch => {
      const planMs = ch.planTiming?.durationMs || 0;
      const proseMs = ch.proseTiming?.durationMs || 0;
      const reviewMs = ch.reviewTiming?.durationMs || 0;
      const revisionDurations = (ch.revisionTimings || []).map(rt => rt.durationMs);
      const chapterRevisionMs = revisionDurations.reduce((sum, current) => sum + current, 0);

      if (planMs > 0) { totalPlanMs += planMs; planCount++; }
      if (proseMs > 0) { totalProseMs += proseMs; proseCount++; }
      if (reviewMs > 0) { totalReviewMs += reviewMs; reviewCount++; }
      if (chapterRevisionMs > 0) { totalRevisionMs += chapterRevisionMs; revisionCount += revisionDurations.length; }

      return {
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        planMs,
        proseMs,
        reviewMs,
        chapterRevisionMs,
        totalCycleMs: planMs + proseMs + reviewMs + chapterRevisionMs,
        modelUsed: ch.modelUsed,
      };
    });

    const completedChapters = chapterMetrics.filter(c => c.proseMs > 0);
    const fastestChapter = completedChapters.length ? completedChapters.reduce((min, ch) => ch.totalCycleMs < min.totalCycleMs ? ch : min) : null;
    const slowestChapter = completedChapters.length ? completedChapters.reduce((max, ch) => ch.totalCycleMs > max.totalCycleMs ? ch : max) : null;

    return {
      initialPlanMs,
      totalPlanMs,
      totalProseMs,
      totalReviewMs,
      totalRevisionMs,
      avgPlanMs: planCount > 0 ? totalPlanMs / planCount : 0,
      avgProseMs: proseCount > 0 ? totalProseMs / proseCount : 0,
      avgReviewMs: reviewCount > 0 ? totalReviewMs / reviewCount : 0,
      avgRevisionMs: revisionCount > 0 ? totalRevisionMs / revisionCount : 0,
      chapterMetrics,
      fastestChapter,
      slowestChapter,
      totalNovelTime: initialPlanMs + totalPlanMs + totalProseMs + totalReviewMs + totalRevisionMs,
    };
  }, [project]);

  const renderContent = () => {
    if (!project || !stats) {
      return <p className="text-slate-400">No project data available to display statistics.</p>;
    }

    const sortedLog = [...(project.systemLog || [])].reverse();

    return (
      <div className="space-y-6 text-slate-300 text-sm">
        <div>
          <h3 className="text-lg font-semibold text-sky-400 mb-2">Overall Project Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-900 p-3 rounded-md">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Total AI Time</span>
              <span className="text-lg font-bold text-sky-300">{formatDuration(stats.totalNovelTime)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Initial Plan</span>
              <span className="text-lg font-semibold">{formatDurationShort(stats.initialPlanMs)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Avg. Plan Time</span>
              <span className="text-lg font-semibold">{formatDurationShort(stats.avgPlanMs)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Avg. Prose Time</span>
              <span className="text-lg font-semibold">{formatDurationShort(stats.avgProseMs)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Avg. Review Time</span>
              <span className="text-lg font-semibold">{formatDurationShort(stats.avgReviewMs)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Avg. Revision Time</span>
              <span className="text-lg font-semibold">{formatDurationShort(stats.avgRevisionMs)}</span>
            </div>
          </div>
        </div>

        <div>
            <h3 className="text-lg font-semibold text-sky-400 mb-2">Chapter Performance</h3>
            <div className="max-h-[40vh] overflow-y-auto bg-slate-900 rounded-md custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-800 z-10">
                        <tr>
                            <th className="p-2 text-xs uppercase text-slate-400">Ch.</th>
                            <th className="p-2 text-xs uppercase text-slate-400">Model</th>
                            <th className="p-2 text-xs uppercase text-slate-400">Plan</th>
                            <th className="p-2 text-xs uppercase text-slate-400">Prose</th>
                            <th className="p-2 text-xs uppercase text-slate-400">Review</th>
                            <th className="p-2 text-xs uppercase text-slate-400">Revisions</th>
                            <th className="p-2 text-xs uppercase text-slate-400">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.chapterMetrics.map(ch => (
                            <tr key={ch.chapterNumber} className="border-t border-slate-700 hover:bg-slate-800/50">
                                <td className="p-2 font-semibold">{ch.chapterNumber}</td>
                                <td className="p-2 text-slate-400">{getModelShortName(ch.modelUsed || project.selectedGlobalAIModel)}</td>
                                <td className="p-2">{ch.planMs > 0 ? formatDurationShort(ch.planMs) : '-'}</td>
                                <td className="p-2">{ch.proseMs > 0 ? formatDurationShort(ch.proseMs) : '-'}</td>
                                <td className="p-2">{ch.reviewMs > 0 ? formatDurationShort(ch.reviewMs) : '-'}</td>
                                <td className="p-2">{ch.chapterRevisionMs > 0 ? formatDurationShort(ch.chapterRevisionMs) : '-'}</td>
                                <td className="p-2 font-semibold text-sky-300">{ch.totalCycleMs > 0 ? formatDurationShort(ch.totalCycleMs) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-xs text-slate-400">
                <p>Fastest Chapter: {stats.fastestChapter ? `Ch. ${stats.fastestChapter.chapterNumber} (${formatDurationShort(stats.fastestChapter.totalCycleMs)})` : 'N/A'}</p>
                <p>Slowest Chapter: {stats.slowestChapter ? `Ch. ${stats.slowestChapter.chapterNumber} (${formatDurationShort(stats.slowestChapter.totalCycleMs)})` : 'N/A'}</p>
            </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLogVisible(!isLogVisible)}
                aria-expanded={isLogVisible}
            >
                {isLogVisible ? 'Hide' : 'Show'} Detailed System Log
            </Button>
            {isLogVisible && (
                <div className="mt-4 p-3 bg-slate-900 rounded-md max-h-[40vh] overflow-y-auto custom-scrollbar font-mono text-xs">
                    {sortedLog.length > 0 ? sortedLog.map((entry, index) => (
                        <div key={index} className={`flex items-start space-x-3 py-1 ${entry.message.startsWith('ERROR') ? 'text-red-400' : 'text-slate-400'}`}>
                            <span className="flex-shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            <span>{entry.message}</span>
                        </div>
                    )) : <p>No system log entries yet.</p>}
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`System Log & Timings: ${project?.title || ''}`} size="xl">
      {renderContent()}
       <style>{`
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #1e293b; /* slate-800 */
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #475569; /* slate-600 */
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #334155; /* slate-700 */
            }
        `}</style>
    </Modal>
  );
};

export default SystemLogModal;