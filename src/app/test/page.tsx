import AnimatedTabs from "@/components/ui/animated-tabs";

export default function TestPage() {
  return (
    <div>
      <AnimatedTabs
        tabs={[
          {
            id: "tab1",
            title: "Tab 1",
            content: <div>Content 1</div>,
          },
          {
            id: "tab2",
            title: "Tab 2",
            content: <div>Content 2</div>,
          },
          {
            id: "tab3",
            title: "Tab 3",
            content: <div>Content 3</div>,
          },
        ]}
      />
    </div>
  );
}