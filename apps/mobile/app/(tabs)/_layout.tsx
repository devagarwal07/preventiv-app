import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#0B6E4F"
            }}
        >
            <Tabs.Screen name="home" options={{ title: "Home" }} />
            <Tabs.Screen name="vitals" options={{ title: "Vitals" }} />
            <Tabs.Screen name="care" options={{ title: "Care" }} />
            <Tabs.Screen name="reports" options={{ title: "Reports" }} />
            <Tabs.Screen name="community" options={{ title: "Community" }} />
        </Tabs>
    );
}
