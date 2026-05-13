import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#F5F2ED] flex flex-col items-center justify-center z-50">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-12 h-12 text-[#2D5A27]" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-[#2D5A27] font-medium"
      >
        लोहा गरम है, हथौड़ा मारो... (लोड हो रहा है)
      </motion.p>
    </div>
  );
};

export default LoadingScreen;
