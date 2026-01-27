"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsIndicator,
} from "./tabs";

export function TabsCode() {
  return (
    <Tabs defaultValue="account" className="">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsIndicator />
      </TabsList>
    </Tabs>
  );
}
