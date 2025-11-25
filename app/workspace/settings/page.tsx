import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Separator } from "../../components/ui/separator";
import { User, Bell, Shield, Palette, Zap } from "lucide-react";

export default function Settings() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">Manage your account and preferences</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="profile">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <Shield className="h-4 w-4 mr-2" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="preferences">
                        <Palette className="h-4 w-4 mr-2" />
                        Preferences
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile">
                    <Card className="p-6">
                        <h2 className="text-xl text-gray-900 mb-6">Profile Information</h2>

                        <div className="flex items-center space-x-6 mb-8">
                            <Avatar className="h-24 w-24">
                                <AvatarFallback className="text-2xl">JD</AvatarFallback>
                            </Avatar>
                            <div>
                                <Button>Change Avatar</Button>
                                <p className="text-sm text-gray-500 mt-2">
                                    JPG, GIF or PNG. Max size 2MB
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-2xl">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>First Name</Label>
                                    <Input defaultValue="John" className="mt-2" />
                                </div>
                                <div>
                                    <Label>Last Name</Label>
                                    <Input defaultValue="Doe" className="mt-2" />
                                </div>
                            </div>

                            <div>
                                <Label>Email</Label>
                                <Input type="email" defaultValue="john@example.com" className="mt-2" />
                            </div>

                            <div>
                                <Label>Company</Label>
                                <Input defaultValue="Virevos Inc." className="mt-2" />
                            </div>

                            <div>
                                <Label>Job Title</Label>
                                <Input defaultValue="Product Manager" className="mt-2" />
                            </div>

                            <Separator className="my-6" />

                            <div className="flex justify-end space-x-3">
                                <Button variant="outline">Cancel</Button>
                                <Button>Save Changes</Button>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications">
                    <Card className="p-6">
                        <h2 className="text-xl text-gray-900 mb-6">Notification Preferences</h2>

                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-gray-900 mb-4">Email Notifications</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">Task assignments</p>
                                            <p className="text-sm text-gray-600">
                                                Receive notifications when tasks are assigned to you
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">Project updates</p>
                                            <p className="text-sm text-gray-600">
                                                Get notified about project status changes
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">Automation alerts</p>
                                            <p className="text-sm text-gray-600">
                                                Receive alerts when automations fail or succeed
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">Weekly summary</p>
                                            <p className="text-sm text-gray-600">
                                                Get a weekly email with your productivity summary
                                            </p>
                                        </div>
                                        <Switch />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-gray-900 mb-4">Push Notifications</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">Desktop notifications</p>
                                            <p className="text-sm text-gray-600">
                                                Show notifications on your desktop
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">Mobile notifications</p>
                                            <p className="text-sm text-gray-600">
                                                Receive push notifications on mobile devices
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-6" />

                            <div className="flex justify-end">
                                <Button>Save Preferences</Button>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security">
                    <Card className="p-6">
                        <h2 className="text-xl text-gray-900 mb-6">Security Settings</h2>

                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-gray-900 mb-4">Change Password</h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label>Current Password</Label>
                                        <Input type="password" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label>New Password</Label>
                                        <Input type="password" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label>Confirm New Password</Label>
                                        <Input type="password" className="mt-2" />
                                    </div>
                                    <Button>Update Password</Button>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-gray-900 mb-4">Two-Factor Authentication</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-900">Enable 2FA</p>
                                        <p className="text-sm text-gray-600">
                                            Add an extra layer of security to your account
                                        </p>
                                    </div>
                                    <Switch />
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-gray-900 mb-4">Active Sessions</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="text-gray-900">Chrome on MacOS</p>
                                            <p className="text-sm text-gray-600">
                                                San Francisco, CA • Active now
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            Revoke
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="text-gray-900">Safari on iPhone</p>
                                            <p className="text-sm text-gray-600">
                                                San Francisco, CA • 2 hours ago
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            Revoke
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences">
                    <Card className="p-6">
                        <h2 className="text-xl text-gray-900 mb-6">App Preferences</h2>

                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h3 className="text-gray-900 mb-4">Appearance</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">Dark mode</p>
                                            <p className="text-sm text-gray-600">
                                                Use dark theme across the app
                                            </p>
                                        </div>
                                        <Switch />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-gray-900 mb-4">Productivity</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">AI suggestions</p>
                                            <p className="text-sm text-gray-600">
                                                Show AI-powered next action suggestions
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-900">Auto-assign tasks</p>
                                            <p className="text-sm text-gray-600">
                                                Automatically assign tasks based on workload
                                            </p>
                                        </div>
                                        <Switch />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-gray-900 mb-4">Integrations</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white p-2 rounded">
                                                <Zap className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-gray-900">Slack</p>
                                                <p className="text-sm text-gray-600">Connected</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            Configure
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white p-2 rounded">
                                                <Zap className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-gray-900">Google Calendar</p>
                                                <p className="text-sm text-gray-600">Connected</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            Configure
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-6" />

                            <div className="flex justify-end">
                                <Button>Save Preferences</Button>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
