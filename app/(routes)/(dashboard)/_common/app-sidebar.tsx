import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { cn } from 'cn';
import { Calendar, CreditCard, Lightbulb, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react'

const mainNav = [
    { name: "Ideas", href: "/ideas", icon: Lightbulb },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Settings", href: "/settings", icon: Settings },
];

const AppSidebar = () => {
    const pathname = usePathname();
    const { state } = useSidebar()
    const isCollapsed = state === 'collapsed'

    return (
        <Sidebar collapsible='icon'>
            <SidebarHeader className={cn("p-4", isCollapsed && "p-2")}>
                <div className='flex items-center justify-between '>
                    <Logo hideName={isCollapsed} />
                    <SidebarTrigger className='hidden md:flex  -mx-8 mb-0' />
                </div>
                <Button className='mt-4 w-full' size={isCollapsed ? "icon" : "lg"}>
                    <Plus className="size-4" />
                    {!isCollapsed && <span>New Post</span>}
                </Button>
            </SidebarHeader>
            <SidebarContent className={cn(!isCollapsed && "px-2")}>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNav.map((item) => (
                                <SidebarMenuItem key={item.name}>
                                    <SidebarMenuButton asChild
                                        isActive={pathname === item.href}
                                        tooltip={item.name}
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="size-4" />
                                            <span className='text-sm'>{item.name}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

            </SidebarContent>
        </Sidebar>
    )
}

export default AppSidebar