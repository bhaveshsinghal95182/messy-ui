"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Tabs, TabsList, TabsTrigger, TabsIndicator } from "./tabs";

interface AnimatedTabsProps {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function AnimatedTabs({ tabs }: { tabs: AnimatedTabsProps[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md relative `}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 rounded-full bg-primary mix-blend-difference"
              />
            )}
            {tab.title}
          </button>
        ))}
      </div>
      <div>
        <Tabs defaultValue={tabs[0].id}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.title}
              </TabsTrigger>
            ))}
            <TabsIndicator />
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
