
import React, { useMemo } from 'react';
import { User, UserRole } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';
import { Link } from 'react-router-dom';

interface OrgChartPageProps {
  currentUser: User;
  employees: User[];
}

const OrgChartPage: React.FC<OrgChartPageProps> = ({ currentUser, employees }) => {
  const canAccessProfile = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR;

  // Build hierarchy tree
  const tree = useMemo(() => {
    const map: Record<string, any> = {};
    const roots: any[] = [];

    employees.forEach(emp => {
      map[emp.id] = { ...emp, children: [] };
    });

    employees.forEach(emp => {
      if (emp.managerId && map[emp.managerId]) {
        map[emp.managerId].children.push(map[emp.id]);
      } else {
        roots.push(map[emp.id]);
      }
    });

    return roots;
  }, [employees]);

  const OrgNode: React.FC<{ node: any, isRoot?: boolean }> = ({ node, isRoot }) => {
    const nodeContent = (
      <div className={`bg-white p-4 rounded-3xl border border-slate-200 shadow-sm relative z-10 transition-all ${
        canAccessProfile 
          ? 'hover:shadow-xl hover:border-indigo-400 group-hover:scale-105 group-active:scale-95 cursor-pointer' 
          : 'cursor-default'
      } w-60`}>
        <div className="flex items-center gap-3">
          <img 
            src={resolveAvatarUrl(node.avatar)} 
            className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-50" 
            alt="" 
          />
          <div className="overflow-hidden">
            <h4 className="font-bold text-slate-800 truncate text-sm">{node.name}</h4>
            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest truncate">{node.jobTitle || node.role}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">{node.department}</span>
          <span className="text-[8px] font-black text-indigo-400">{node.children.length} Reports</span>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col items-center">
        <div className="relative group">
          {canAccessProfile ? (
            <Link to={`/profile/${node.id}`} className="block">
              {nodeContent}
            </Link>
          ) : (
            nodeContent
          )}
          {node.children.length > 0 && (
            <div className="h-8 w-px bg-slate-200 mx-auto"></div>
          )}
        </div>

        {node.children.length > 0 && (
          <div className="relative pt-4">
            {/* Connecting Horizontal Line */}
            {node.children.length > 1 && (
                <div className="absolute top-0 left-1/4 right-1/4 h-px bg-slate-200"></div>
            )}
            <div className="flex gap-8 items-start">
              {node.children.map((child: any) => (
                <div key={child.id} className="relative pt-4">
                  {/* Vertical Stub */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-slate-200"></div>
                  <OrgNode node={child} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Organization Structure</h1>
        <p className="text-sm text-slate-500">Visual hierarchy of company reporting lines.</p>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-auto p-8 md:p-12 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="min-w-max mx-auto h-full flex flex-col items-center">
          {tree.map(root => (
            <div key={root.id} className="mb-12">
              <OrgNode node={root} isRoot />
            </div>
          ))}
          {tree.length === 0 && (
              <div className="text-center py-20">
                 <i className="fas fa-sitemap text-4xl text-slate-200 mb-4"></i>
                 <p className="text-slate-400 font-medium italic">No organization data found.</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgChartPage;
