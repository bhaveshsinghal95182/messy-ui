import ProgressBar from "@/registry/new-york/progress-bar/progress-bar";

export default function TestPage() {
  return (
    <div className="scroll-box diagonal-bg flex items-center justify-center flex-col h-screen border-2 scrollbar">
      <ProgressBar className="bg-foreground" origin="left" height={1.5} />
      <div className="h-full bg-background w-[calc(100%-80px)] flex items-center justify-center border-x-2 border-b-2">
        Test Page
      </div>
      <div className="h-full bg-background w-[calc(100%-80px)] flex items-center justify-center border-x-2">
        some more content
      </div>
    </div>
  );
}
