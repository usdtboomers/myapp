import React, { useState } from "react";
import axios from "axios";

function ReferralTree() {
  const [userId, setUserId] = useState("");
  const [treeData, setTreeData] = useState(null);
  const [directCount, setDirectCount] = useState(0);
  const [totalTeamCount, setTotalTeamCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  // 🔹 Load root user tree with children counts
  const handleLoadTree = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");

    try {
      const [treeRes, allTeamRes] = await Promise.all([
        axios.get(`http://178.128.20.53:5000/api/user/tree/${userId}`),
        axios.get(`http://178.128.20.53:5000/api/user/all-team/${userId}`),
      ]);

      // Add child counts and expanded info
      const childrenWithCounts = await Promise.all(
        (treeRes.data.children || []).map(async (child) => {
          try {
            const teamRes = await axios.get(
              `http://178.128.20.53:5000/api/user/all-team/${child.userId}`
            );
            return {
              ...child,
              expanded: false,
              childrenLoaded: false,
              directCount: child.children?.length || 0,
              totalCount: teamRes.data.totalTeamCount || 0,
            };
          } catch {
            return {
              ...child,
              expanded: false,
              childrenLoaded: false,
              directCount: child.children?.length || 0,
              totalCount: 0,
            };
          }
        })
      );

      const rootNode = {
        ...treeRes.data,
        expanded: true,
        childrenLoaded: true,
        children: childrenWithCounts,
        directCount: treeRes.data.children?.length || 0,
        totalCount: allTeamRes.data.totalTeamCount,
      };

      setTreeData(rootNode);
      setDirectCount(rootNode.directCount);
      setTotalTeamCount(rootNode.totalCount);
      setSearchResult(null);
    } catch (err) {
      console.error(err);
      setError("❌ Referral tree not found or error fetching data");
      setTreeData(null);
      setDirectCount(0);
      setTotalTeamCount(0);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Expand/collapse a node and lazy load children
  const handleExpandNode = async (node) => {
    if (node.childrenLoaded) {
      node.expanded = !node.expanded;
      setTreeData({ ...treeData });
      return;
    }

    try {
      const [treeRes, allTeamRes] = await Promise.all([
        axios.get(`http://178.128.20.53:5000/api/user/tree/${node.userId}`),
        axios.get(`http://178.128.20.53:5000/api/user/all-team/${node.userId}`),
      ]);

      const childrenWithCounts = await Promise.all(
        (treeRes.data.children || []).map(async (child) => {
          try {
            const teamRes = await axios.get(
              `http://178.128.20.53:5000/api/user/all-team/${child.userId}`
            );
            return {
              ...child,
              expanded: false,
              childrenLoaded: false,
              directCount: child.children?.length || 0,
              totalCount: teamRes.data.totalTeamCount || 0,
            };
          } catch {
            return {
              ...child,
              expanded: false,
              childrenLoaded: false,
              directCount: child.children?.length || 0,
              totalCount: 0,
            };
          }
        })
      );

      node.children = childrenWithCounts;
      node.directCount = treeRes.data.children?.length || 0;
      node.totalCount = allTeamRes.data.totalTeamCount;
      node.childrenLoaded = true;
      node.expanded = true;

      setTreeData({ ...treeData });
    } catch (err) {
      console.error(err);
    }
  };

  // 🔹 Recursive tree renderer
  const renderTree = (node) => {
    const isMatch =
      searchQuery &&
      (String(node.userId).includes(searchQuery) ||
        (node.name &&
          node.name.toLowerCase().includes(searchQuery.toLowerCase())));

    return (
      <li key={node.userId} className="list-none">
        <div
          onClick={() => handleExpandNode(node)}
          className={`cursor-pointer p-2 rounded-lg text-sm font-medium shadow-md flex flex-col gap-1 ${
            isMatch
              ? "bg-yellow-200 text-yellow-900 border border-yellow-400"
              : "bg-blue-100 text-blue-900"
          }`}
        >
          <div className="flex justify-between items-center">
            <span>
              {node.name || "Unnamed User"}{" "}
              <span className="text-gray-700">(ID: {node.userId})</span>
            </span>
            <span className="text-xs text-gray-600">
              {node.expanded ? "▼" : "▶"}
            </span>
          </div>
          <div className="text-xs text-gray-700 flex gap-4">
            <span>👥 Direct: {node.directCount || 0}</span>
            <span>🌐 Total: {node.totalCount || 0}</span>
          </div>
        </div>

        {node.expanded && node.children && node.children.length > 0 && (
          <ul className="ml-6 mt-2 space-y-2 border-l pl-3 border-blue-200">
            {node.children.map((child) => renderTree(child))}
          </ul>
        )}
      </li>
    );
  };

  // 🔹 Search recursively and auto expand parents
  const searchInTree = (node, query) => {
    if (!node) return null;

    if (
      String(node.userId).includes(query) ||
      (node.name && node.name.toLowerCase().includes(query.toLowerCase()))
    ) {
      node.expanded = true;
      return node;
    }

    if (node.children) {
      for (let child of node.children) {
        const found = searchInTree(child, query);
        if (found) {
          node.expanded = true;
          return found;
        }
      }
    }

    return null;
  };

  const handleSearchInTree = () => {
    if (!searchQuery || !treeData) return;
    const found = searchInTree(treeData, searchQuery);
    setSearchResult(found);
    setTreeData({ ...treeData });
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-md">
      <h2 className="text-xl font-semibold text-indigo-600 mb-4">
        🌳 Referral Tree
      </h2>

      {/* Load Tree */}
      <div className="flex gap-3 mb-4">
        <input
          type="number"
          placeholder="Enter User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="border rounded px-4 py-2 w-full"
        />
        <button
          onClick={handleLoadTree}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading
              ? "bg-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Loading..." : "Load Tree"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm italic mb-3">{error}</p>}

      {/* Tree Stats */}
      {treeData && (
        <div className="mb-4 text-sm text-gray-700 space-y-1">
          <p>
            <strong>👥 Direct Team:</strong> {directCount}
          </p>
          <p>
            <strong>🌐 Total Team (All Levels):</strong> {totalTeamCount}
          </p>
        </div>
      )}

      {/* Search */}
      {treeData && (
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by ID or Name in tree"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded px-4 py-2 w-full"
          />
          <button
            onClick={handleSearchInTree}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Search
          </button>
        </div>
      )}

      {/* Search Result */}
      {searchResult && (
        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">
            🔎 Search Result (Pinned on Top)
          </h3>
          <ul className="ml-2">{renderTree(searchResult)}</ul>
        </div>
      )}

      {/* Full Tree */}
      {treeData && (
        <>
          <h3 className="font-semibold text-gray-700 mt-4">🌐 Full Tree</h3>
          <ul className="mt-2 ml-2">{renderTree(treeData)}</ul>
        </>
      )}
    </div>
  );
}

export default ReferralTree;
