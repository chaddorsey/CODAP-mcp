import React from "react";

interface AccordionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ 
  title, 
  isOpen, 
  onToggle, 
  children,
  className = ""
}) => {
  return (
    <div className={`sage-accordion ${className}`}>
      <button 
        className={`sage-accordion-header ${isOpen ? "" : "collapsed"}`}
        onClick={onToggle}
      >
        <span className="arrow">&#9660;</span>
        {title}
      </button>
      {isOpen && (
        <div className="sage-accordion-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default Accordion; 
