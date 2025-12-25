import React, { useEffect, useState } from 'react';
import api from 'api/axios';
import ReferralTreeView from '../../components/ReferralTreeView';

const AllTeamTreePage = () => {
  const [rootUser, setRootUser] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchTeamTree = async () => {
      try {
        const res = await api.get(`/user/team-tree/${user.userId}`);
        setRootUser(res.data.tree); // You should return { tree: { userId, name, level, children: [...] } }
      } catch (err) {
        console.error("Error loading tree", err);
      }
    };

    if (user?.userId) {
      fetchTeamTree();
    }
  }, [user?.userId]);

  return (
    <div>
      <ReferralTreeView rootUser={rootUser} />
    </div>
  );
};

export default AllTeamTreePage;
