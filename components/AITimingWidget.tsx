import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { formatDuration, formatDurationShort } from '../src/utils/timeUtils';

// A single metric display component
const MetricDisplay: React.FC<{ label: string; value: number; format?: 'short' | 'long'; title?: string; className?: string }> = ({ label, value, format = 'short', title = '', className = '' }) => (
    <div className={`flex flex-col items-center justify-center text-center p-1 ${className}`} title={title}>
        <span className="text-xs text-slate-400 uppercase font-semibold">{label}</span>
        <span className="font-mono text-base text-white">
            {format === 'short' ? formatDurationShort(value) : formatDuration(value)}
        </span>
    </div>
);

// The main widget component
const AITimingWidget: React.FC = () => {
    const { activeProject, isAITaskRunning, timerSeconds } = useProject();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rotatingMetricIndex, setRotatingMetricIndex] = useState(0);
    const widgetRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Memoize metric calculations
    const metrics = useMemo(() => {
        if (!activeProject) {
            return {
                totalMs: 0, lastTurnMs: 0, lastChapterTimeMs: 0, avgChapterTimeMs: 0,
                lastChapterNumber: null, avgTurnMs: 0, totalProseMs: 0, totalPlanMs: 0,
                totalReviewMs: 0, avgProseMs: 0, avgPlanMs: 0, avgReviewMs: 0,
                lastProseMs: 0, lastPlanMs: 0, lastReviewMs: 0,
            };
        }
        
        // --- Define Chapter Pools ---
        const currentProcessingChapterNumber = activeProject.currentChapterProcessing;
        // Completed chapters are those with a number strictly less than the one currently being processed.
        const completedChapters = activeProject.chapters.filter(ch => ch.chapterNumber < currentProcessingChapterNumber);
        const reversedCompletedChapters = [...completedChapters].reverse();
        
        // All chapters with any timing data, for calculating overall averages.
        const allChaptersWithTimings = activeProject.chapters.filter(ch => ch.planTiming || ch.proseTiming || ch.reviewTiming);

        // --- Overall Totals & Averages ---
        const initialPlanMs = activeProject.initialAISetupPlan?.timing?.durationMs || 0;
        let totalMs = initialPlanMs;
        let totalPlanMs = initialPlanMs;
        let totalProseMs = 0;
        let totalReviewMs = 0;
        let totalRevisionMs = 0;
        let planCount = initialPlanMs > 0 ? 1 : 0;
        let proseCount = 0;
        let reviewCount = 0;
        let revisionCount = 0;
        
        allChaptersWithTimings.forEach(ch => {
            if (ch.planTiming) { const duration = ch.planTiming.durationMs; totalMs += duration; totalPlanMs += duration; planCount++; }
            if (ch.proseTiming) { const duration = ch.proseTiming.durationMs; totalMs += duration; totalProseMs += duration; proseCount++; }
            if (ch.reviewTiming) { const duration = ch.reviewTiming.durationMs; totalMs += duration; totalReviewMs += duration; reviewCount++; }
            (ch.revisionTimings || []).forEach(rt => { totalMs += rt.durationMs; totalRevisionMs += rt.durationMs; revisionCount++; });
        });

        let avgChapterTimeMs = 0;
        // Average Chapter Time is based on chapters that are truly finished (i.e., not the one in progress) and have prose.
        const chaptersForAvg = completedChapters.filter(ch => ch.proseTiming);
        if (chaptersForAvg.length > 0) {
            const totalTimeOfCompletedChaptersForAvg = chaptersForAvg.reduce((totalSum, ch) => {
                const chapterTime = (ch.planTiming?.durationMs || 0) + (ch.proseTiming?.durationMs || 0) + (ch.reviewTiming?.durationMs || 0) + (ch.revisionTimings || []).reduce((sum, rt) => sum + rt.durationMs, 0);
                return totalSum + chapterTime;
            }, 0);
            avgChapterTimeMs = totalTimeOfCompletedChaptersForAvg / chaptersForAvg.length;
        }

        const totalTurnCount = planCount + proseCount + reviewCount + revisionCount;
        const avgTurnMs = totalTurnCount > 0 ? totalMs / totalTurnCount : 0;
        const avgProseMs = proseCount > 0 ? totalProseMs / proseCount : 0;
        const avgPlanMs = planCount > 0 ? totalPlanMs / planCount : 0;
        const avgReviewMs = reviewCount > 0 ? totalReviewMs / reviewCount : 0;
        
        // --- "Last" Metrics Logic ---
        const lastTurnMs = activeProject.lastTurnDurationMs || 0;

        // Calculate Last Chapter time from COMPLETED chapters
        const lastCompletedChapter = reversedCompletedChapters.find(ch => ch.planTiming || ch.proseTiming || ch.reviewTiming || (ch.revisionTimings && ch.revisionTimings.length > 0));

        let lastChapterTimeMs = 0;
        let lastChapterNumber = null;
        if (lastCompletedChapter) {
            lastChapterNumber = lastCompletedChapter.chapterNumber;
            lastChapterTimeMs = (lastCompletedChapter.planTiming?.durationMs || 0) +
                                (lastCompletedChapter.proseTiming?.durationMs || 0) +
                                (lastCompletedChapter.reviewTiming?.durationMs || 0) +
                                (lastCompletedChapter.revisionTimings || []).reduce((sum, rt) => sum + rt.durationMs, 0);
        }
        
        // Calculate Last Task-specific times from COMPLETED chapters
        const lastProseMs = reversedCompletedChapters.find(ch => ch.proseTiming?.durationMs)?.proseTiming?.durationMs || 0;
        const lastReviewMs = reversedCompletedChapters.find(ch => ch.reviewTiming?.durationMs)?.reviewTiming?.durationMs || 0;
        
        // Last Plan can be from a completed chapter OR the initial novel plan if no chapters are complete yet
        const lastPlanMsFromChapters = reversedCompletedChapters.find(ch => ch.planTiming?.durationMs)?.planTiming?.durationMs || 0;
        let lastPlanMs = lastPlanMsFromChapters;
        if (lastPlanMsFromChapters === 0 && completedChapters.length === 0) {
            lastPlanMs = initialPlanMs;
        }
        
        return { 
            totalMs, lastTurnMs, lastChapterTimeMs, avgChapterTimeMs, lastChapterNumber,
            avgTurnMs, totalProseMs, totalPlanMs, totalReviewMs,
            avgProseMs, avgPlanMs, avgReviewMs,
            lastProseMs, lastPlanMs, lastReviewMs,
        };
    }, [activeProject]);
    
    // Effect for the rotating metric timer
    useEffect(() => {
        const interval = setInterval(() => {
            setRotatingMetricIndex(prevIndex => prevIndex + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Effect to handle clicks outside the modal
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isModalOpen && modalRef.current && !modalRef.current.contains(event.target as Node) && widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
                setIsModalOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModalOpen]);

    // Data for the rotating metric in collapsed view
    const rotatingMetricsDataCollapsed = [
        { label: "LAST TN", value: metrics.lastTurnMs, available: metrics.lastTurnMs > 0, title: "Duration of the most recent AI task" },
        { label: "LAST CH", value: metrics.lastChapterTimeMs, available: metrics.lastChapterTimeMs > 0, title: "Total time for the last chapter worked on" }
    ];
    const availableMetricsCollapsed = rotatingMetricsDataCollapsed.filter(m => m.available);
    const currentRotatingMetricCollapsed = availableMetricsCollapsed.length > 0 ? availableMetricsCollapsed[rotatingMetricIndex % availableMetricsCollapsed.length] : null;

    const modalStyle: React.CSSProperties = {};
    if (widgetRef.current) {
        const rect = widgetRef.current.getBoundingClientRect();
        modalStyle.position = 'fixed';
        modalStyle.top = `${rect.bottom + 2}px`; // 2px below the widget
        modalStyle.right = `${window.innerWidth - rect.right}px`;
        modalStyle.width = `${rect.width}px`;
    }

    return (
        <>
            {/* Collapsed Widget */}
            <div
                ref={widgetRef}
                className="border border-sky-500 bg-slate-800/50 rounded-lg text-white cursor-pointer transition-all duration-300 ease-in-out"
                onClick={() => setIsModalOpen(!isModalOpen)}
                aria-expanded={isModalOpen}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(!isModalOpen); }}
            >
                <div className="flex items-center justify-evenly space-x-2 p-2">
                    <div className="flex items-baseline space-x-2" title="Total accumulated AI generation time for this project.">
                        <span className="text-xs text-sky-400 uppercase font-semibold">Total</span>
                        <span className="font-mono text-base">{formatDuration(metrics.totalMs)}</span>
                    </div>
                    <div className={`flex items-baseline space-x-2 transition-opacity duration-300 ${isAITaskRunning ? 'opacity-100' : 'opacity-50'}`} title="Time for the current AI task.">
                        <span className="text-xs text-sky-400 uppercase font-semibold">Current</span>
                        <span className={`font-mono text-base ${isAITaskRunning ? 'animate-pulse text-sky-300' : ''}`}>{formatDuration(timerSeconds * 1000)}</span>
                    </div>
                    {currentRotatingMetricCollapsed ? (
                        <div className="flex items-baseline space-x-2" title={currentRotatingMetricCollapsed.title}>
                             <span className="text-xs text-sky-400 uppercase font-semibold transition-opacity duration-300" key={currentRotatingMetricCollapsed.label}>
                                {currentRotatingMetricCollapsed.label}
                             </span>
                            <span className="font-mono text-base">{formatDuration(currentRotatingMetricCollapsed.value)}</span>
                        </div>
                    ) : (
                         <div className="flex items-baseline space-x-2 opacity-50">
                            <span className="text-xs text-sky-400 uppercase font-semibold">LAST TN</span>
                            <span className="font-mono text-base">00:00:00</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Modal */}
            {isModalOpen && (
                <>
                    {/* Overlay */}
                    <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsModalOpen(false)}></div>
                    {/* Modal Content */}
                    <div
                        ref={modalRef}
                        style={modalStyle}
                        className="bg-slate-800/80 backdrop-blur-sm border border-sky-500 rounded-lg shadow-2xl z-50 animate-fade-in-down"
                    >
                        <div className="grid grid-cols-3 gap-x-2 sm:gap-x-4 gap-y-3 p-3">
                             {/* Row 1 */}
                            <div className={`flex flex-col items-center justify-center text-center p-1 transition-opacity duration-300 ${isAITaskRunning ? 'opacity-100' : 'opacity-50'}`} title="Time for the current AI task.">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Current TN</span>
                                <span className={`font-mono text-base ${isAITaskRunning ? 'animate-pulse text-sky-300' : 'text-white'}`}>{formatDuration(timerSeconds * 1000)}</span>
                            </div>
                            <MetricDisplay label="Last TN" value={metrics.lastTurnMs} title="Duration of the most recent AI task" />
                            <MetricDisplay label={`Last CH (${metrics.lastChapterNumber || 'N/A'})`} value={metrics.lastChapterTimeMs} title="Total time for the last completed chapter" />

                            {/* Row 2 */}
                            <MetricDisplay label="Total Time" value={metrics.totalMs} format="long" title="Total accumulated AI generation time for this project" />
                            <MetricDisplay label="Avg. TN Time" value={metrics.avgTurnMs} title="Average time for any single AI task (plan, prose, review, etc.)" />
                            <MetricDisplay label="Avg. CH Time" value={metrics.avgChapterTimeMs} title="Average time across all completed chapters" />

                            {/* Row 3 */}
                            <MetricDisplay label="Last Plan" value={metrics.lastPlanMs} title="Time for the last planning step (incl. initial)" />
                            <MetricDisplay label="Last Prose" value={metrics.lastProseMs} title="Time for the last prose generation step" />
                            <MetricDisplay label="Last Review" value={metrics.lastReviewMs} title="Time for the last review step" />
                            
                            {/* Row 4 */}
                            <MetricDisplay label="Avg. Plan" value={metrics.avgPlanMs} title="Average time per planning step" />
                            <MetricDisplay label="Avg. Prose" value={metrics.avgProseMs} title="Average time per prose generation step" />
                            <MetricDisplay label="Avg. Review" value={metrics.avgReviewMs} title="Average time per review step" />
                        </div>
                    </div>
                </>
            )}
            <style>{`
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.2s ease-out forwards;
                }
            `}</style>
        </>
    );
};

export default AITimingWidget;