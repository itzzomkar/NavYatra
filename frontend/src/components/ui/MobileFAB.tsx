import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  CpuChipIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color?: string;
  bgColor?: string;
}

interface MobileFABProps {
  actions?: FABAction[];
  onMainAction?: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

const defaultActions: FABAction[] = [
  {
    id: 'optimize',
    label: 'Optimize',
    icon: SparklesIcon,
    onClick: () => console.log('Optimize clicked'),
    color: 'text-white',
    bgColor: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: 'ai-decision',
    label: 'AI Decision',
    icon: CpuChipIcon,
    onClick: () => console.log('AI Decision clicked'),
    color: 'text-white',
    bgColor: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: 'simulate',
    label: 'Simulate',
    icon: RocketLaunchIcon,
    onClick: () => console.log('Simulate clicked'),
    color: 'text-white',
    bgColor: 'bg-purple-500 hover:bg-purple-600'
  }
];

const MobileFAB: React.FC<MobileFABProps> = ({
  actions = defaultActions,
  onMainAction,
  className = '',
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-center': 'bottom-20 left-1/2 transform -translate-x-1/2'
  };

  const handleMainClick = () => {
    if (onMainAction) {
      onMainAction();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className={`lg:hidden fixed z-40 ${positionClasses[position]} ${className}`}>
      {/* Action buttons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center space-y-3 mb-3"
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleActionClick(action)}
                className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg ${
                  action.bgColor || 'bg-white hover:bg-gray-50'
                } transition-all transform hover:scale-105`}
              >
                <action.icon className={`h-6 w-6 ${action.color || 'text-gray-600'}`} />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleMainClick}
        className="flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <XMarkIcon className="h-6 w-6 text-white" />
          ) : (
            <PlusIcon className="h-6 w-6 text-white" />
          )}
        </motion.div>
      </motion.button>

      {/* Action labels (optional) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-16 bottom-0 flex flex-col items-end space-y-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={`label-${action.id}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.05 + 0.1 }}
                className="bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap shadow-lg"
                style={{ marginTop: index === 0 ? '48px' : '0' }}
              >
                {action.label}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-20 -z-10"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileFAB;