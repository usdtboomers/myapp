import React, { useEffect, useState } from "react";
import api from "../../api/axios"; 
import useAuth from "../../hooks/useAuth"; 

// Match backend logic precisely
const RANK_RULES = {
  1: { reqDirectRank: 0, reqDirectCount: 5, reqTeamSize: 10 },
  2: { reqDirectRank: 1, reqDirectCount: 2, reqTeamSize: 30 },
  3: { reqDirectRank: 1, reqDirectCount: 5, reqTeamSize: 150 },
  4: { reqDirectRank: 2, reqDirectCount: 2, reqTeamSize: 250 },
  5: { reqDirectRank: 2, reqDirectCount: 5, reqTeamSize: 1000 },
  6: { reqDirectRank: 3, reqDirectCount: 2, reqTeamSize: 3000 },
  7: { reqDirectRank: 3, reqDirectCount: 5, reqTeamSize: 5000 },
  8: { reqDirectRank: 4, reqDirectCount: 2, reqTeamSize: 10000 },
  9: { reqDirectRank: 4, reqDirectCount: 5, reqTeamSize: 25000 },
};

const REWARD_TRACKS = [
  { name: "Manager", prefix: "M", minPackage: 30, rankField: "managerRank", rewards: [0, 50, 150, 250, 500, 1000, 2500, 5000, 25000, 50000], color: "blue" },
  { name: "Senior Manager", prefix: "SM", minPackage: 60, rankField: "seniorManagerRank", rewards: [0, 100, 300, 500, 1000, 2000, 5000, 10000, 50000, 100000], color: "purple" },
  { name: "Executive Manager", prefix: "EM", minPackage: 120, rankField: "executiveManagerRank", rewards: [0, 200, 600, 1000, 2000, 4000, 10000, 20000, 100000, 200000], color: "pink" }
];

const RewardProgress = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!user?.userId) return;
    const fetchStats = async () => {
      try {
        const res = await api.get(`/user/reward-stats/${user.userId}`);
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch reward stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user?.userId]);

  if (loading) return <div className="text-white p-5 text-center">Loading progress...</div>;
  if (!stats) return <div className="text-white p-5 text-center">Failed to load data.</div>;

  const currentTrack = REWARD_TRACKS[activeTab];
  const userCurrentRank = stats.currentRanks[currentTrack.rankField];
  const currentTeamSize = stats.teamSizes[currentTrack.minPackage];
  
  // Array of 1 to 9 ranks
  const ranksArray = Array.from({ length: 9 }, (_, i) => i + 1);

  return (
    <div style={styles.container}>
      <h2 className="text-white font-bold text-2xl mb-2">🏆 Reward Progression</h2>
      <p className="text-white text-sm mb-6">Track your team building milestones and unlock USDT rewards.</p>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        {REWARD_TRACKS.map((track, idx) => (
          <button
            key={track.name}
            onClick={() => setActiveTab(idx)}
            style={{
              ...styles.tabButton,
              backgroundColor: activeTab === idx ? "#4A90E2" : "#1e293b",
              color: activeTab === idx ? "white" : "#94a3b8",
            }}
          >
            {track.name} (${track.minPackage})
          </button>
        ))}
      </div>

      {/* Own Package Warning */}
      {stats.ownTopUpAmount < currentTrack.minPackage && (
        <div style={styles.warningBox}>
          ⚠️ <strong>Package Required:</strong> You need a minimum personal Top-Up of <strong>${currentTrack.minPackage}</strong> to qualify for {currentTrack.name} rewards. Your current package is ${stats.ownTopUpAmount}.
        </div>
      )}

      {/* Rank Cards */}
      <div style={styles.grid}>
        {ranksArray.map((rankLevel) => {
          const rules = RANK_RULES[rankLevel];
          const rewardAmount = currentTrack.rewards[rankLevel];
          const isAchieved = userCurrentRank >= rankLevel;
          
          // Calculate valid directs for this specific rank requirement
          const validDirectsCount = stats.directs.filter(
            d => d.topUpAmount >= currentTrack.minPackage && (d[currentTrack.rankField] || 0) >= rules.reqDirectRank
          ).length;

          // Progress Calculations
          const directsProgress = Math.min(validDirectsCount, rules.reqDirectCount);
          const directsPercent = (directsProgress / rules.reqDirectCount) * 100;
          
          const teamProgress = Math.min(currentTeamSize, rules.reqTeamSize);
          const teamPercent = (teamProgress / rules.reqTeamSize) * 100;

          return (
            <div key={rankLevel} style={{
              ...styles.card, 
              borderColor: isAchieved ? "#22c55e" : "#334155",
              opacity: (stats.ownTopUpAmount < currentTrack.minPackage) ? 0.6 : 1
            }}>
              
              {/* Header */}
              <div style={styles.cardHeader}>
                <h3 className="font-bold text-lg text-white">
                  {currentTrack.prefix} {rankLevel}
                </h3>
                {isAchieved ? (
                  <span style={styles.achievedBadge}>✓ Achieved</span>
                ) : (
                  <span style={styles.rewardBadge}>💰 ${rewardAmount} USDT</span>
                )}
              </div>

              {/* Requirement 1: Directs */}
              <div style={styles.requirementBlock}>
                <div style={styles.reqHeader}>
                  <span className="text-sm text-white">
                    Directs Needed (Rank {rules.reqDirectRank})
                  </span>
                  <span className="text-sm font-bold text-white">
                    {directsProgress} / {rules.reqDirectCount}
                  </span>
                </div>
                <div style={styles.progressBarBg}>
                  <div style={{ ...styles.progressBarFill, width: `${directsPercent}%`, backgroundColor: isAchieved ? "#22c55e" : "#3b82f6" }}></div>
                </div>
              </div>

              {/* Requirement 2: Downline Team Size */}
              <div style={styles.requirementBlock}>
                <div style={styles.reqHeader}>
                  <span className="text-sm text-white">
                    Downline Team Size
                  </span>
                  <span className="text-sm font-bold text-white">
                    {teamProgress} / {rules.reqTeamSize}
                  </span>
                </div>
                <div style={styles.progressBarBg}>
                  <div style={{ ...styles.progressBarFill, width: `${teamPercent}%`, backgroundColor: isAchieved ? "#22c55e" : "#a855f7" }}></div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Inter, sans-serif",
  },
  tabContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap"
  },
  tabButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  warningBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#1e293b",
    border: "2px solid #334155",
    borderRadius: "12px",
    padding: "20px",
    transition: "transform 0.2s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "1px solid #334155"
  },
  achievedBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    color: "#4ade80",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  rewardBadge: {
    backgroundColor: "rgba(234, 179, 8, 0.2)",
    color: "#fde047",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  requirementBlock: {
    marginBottom: "15px"
  },
  reqHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px"
  },
  progressBarBg: {
    width: "100%",
    height: "8px",
    backgroundColor: "#0f172a",
    borderRadius: "4px",
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.5s ease"
  }
};

export default RewardProgress;