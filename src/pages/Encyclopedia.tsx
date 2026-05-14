import React, { useState } from 'react';
import { motion } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { useNavigate } from 'react-router-dom';
import { Search, Bug, Droplet, Sprout, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

type IssueType = 'all' | 'pest' | 'disease' | 'deficiency';

const Encyclopedia: React.FC = () => {
  const { agriIssues, loadAgriIssues, loadCategoryData } = useAppContext();
  const [activeType, setActiveType] = useState<IssueType>('all');

  React.useEffect(() => {
    const unsubIssues = loadAgriIssues();
    const unsubCats = loadCategoryData();
    return () => {
      if (unsubIssues) unsubIssues();
      if (unsubCats) unsubCats();
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const types = [
    { id: 'all', label: 'सभी', icon: Sprout, color: 'bg-green-500' },
    { id: 'pest', label: 'कीट (Pests)', icon: Bug, color: 'bg-orange-500' },
    { id: 'disease', label: 'रोग (Diseases)', icon: Droplet, color: 'bg-blue-500' },
    { id: 'deficiency', label: 'पोषक तत्व की कमी', icon: Sprout, color: 'bg-purple-500' },
  ];

  const filteredIssues = agriIssues.filter(issue => {
    const matchesSearch = 
      issue.hindiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.englishName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeType === 'all' || issue.type === activeType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#F5F2ED] pb-24 pt-4">
      <div className="px-5 mb-6">
        <h1 className="text-2xl font-black text-[#4A3728] mb-1">कृषि विश्वकोश</h1>
        <p className="text-xs text-gray-500 font-medium tracking-tight">अपनी फसल की समस्याओं का समाधान यहाँ खोजें</p>
      </div>

      <div className="px-5 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="कीट या रोग का नाम खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 text-sm font-medium shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 transition-all"
          />
        </div>
      </div>

      <div className="px-5 mb-8">
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id as IssueType)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm border",
                activeType === type.id 
                  ? "bg-[#2D5A27] text-white border-[#2D5A27] scale-105" 
                  : "bg-white text-gray-500 border-gray-100"
              )}
            >
              <type.icon className={cn("w-4 h-4", activeType === type.id ? "text-white" : "text-gray-400")} />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm font-medium">कोई परिणाम नहीं मिला</p>
          </div>
        ) : (
          filteredIssues.map((issue, idx) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(`/encyclopedia/${issue.id}`)}
              className="bg-white rounded-[24px] p-4 flex items-center gap-4 shadow-sm border border-gray-100 active:scale-98 transition-all"
            >
              <div className="relative">
                <SmartImage 
                  src={issue.image} 
                  alt={issue.hindiName} 
                  className="w-20 h-20 rounded-2xl border border-gray-50"
                  objectFit="cover"
                />
                <div className={cn(
                  "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md",
                  issue.type === 'pest' ? 'bg-orange-500' : issue.type === 'disease' ? 'bg-blue-500' : 'bg-purple-500'
                )}>
                  {issue.type === 'pest' ? <Bug className="w-3 h-3 text-white" /> : 
                   issue.type === 'disease' ? <Droplet className="w-3 h-3 text-white" /> : 
                   <Sprout className="w-3 h-3 text-white" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-lg leading-tight mb-0.5">{issue.hindiName}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{issue.englishName}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{issue.description}</p>
              </div>
              <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Encyclopedia;
