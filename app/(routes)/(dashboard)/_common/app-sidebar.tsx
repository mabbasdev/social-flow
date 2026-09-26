"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Calendar, CreditCard, Lightbulb, Plus, PlusCircleIcon, Settings } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { getChannelIcon, getChannelUrl } from '@/constants/channels';
import { ChannelType } from '@/types/channel.type';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { UserButton } from '@clerk/nextjs';
import ChannelAvatar from '@/components/channel-avatar';

const mainNav = [
    { name: "Ideas", href: "/ideas", icon: Lightbulb },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Settings", href: "/settings", icon: Settings },
];

const AppSidebar = () => {
    const pathname = usePathname();
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"

    const { data: channelsData, isPending } = useQuery({
        queryKey: ['channels'],
        queryFn: async () => {
            const res = await fetch('/api/channels');
            const data = await res.json();
            return data
        }
    })

    const channels = (channelsData?.channels || []) as ChannelType[];
    const unconnectedChannels = channels.filter((channel: ChannelType) => !channel.connected);
    const connectedChannels = channels.filter((channel: ChannelType) => channel.connected);

    const connectedCount = channelsData?.connectedCount || 0;
    const totalChannels = channelsData?.totalChannels || 0;
    const limitedChannels = unconnectedChannels.slice(0, 4)

    return (
        <>
            <Sidebar collapsible="icon">
                <SidebarHeader className={cn("p-4", isCollapsed && "p-2")}>
                    <div className='flex items-center justify-between'>
                        <Logo hideName={isCollapsed} />
                        <SidebarTrigger className="hidden md:flex -mx-8 mb-0" />
                    </div>
                    <Button className='mt-4 w-full'
                        size={isCollapsed ? "icon" : "lg"}
                    >
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

                    {/* Connected Channels */}
                    {connectedChannels.length > 0 && (
                        <SidebarGroup className={cn(isCollapsed && "px-1")}>
                            <SidebarGroupLabel className='text-sm'>Channels</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {connectedChannels?.map((channel: ChannelType) => {
                                        const url = getChannelUrl(channel.type)

                                        return (
                                            <SidebarMenuItem key={channel.id}>
                                                <SidebarMenuButton asChild>
                                                    <a
                                                        href={`${url}/${channel.handle}`}
                                                        target='_blank' rel="noreferrer"
                                                        className='w-full relative flex items-center gap-2'
                                                    >
                                                        <ChannelAvatar
                                                            size="sm"
                                                            type={channel.type}
                                                            color={channel.color}
                                                            profileImage={channel.profile_image}
                                                            name={!isCollapsed ? (channel.name || channel.handle) : ""}
                                                        />
                                                    </a>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    {/* Unconnected Channels */}
                    <SidebarGroup className={cn(isCollapsed && "px-1")}>
                        <SidebarGroupLabel className='text-sm'>Connect Channels</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {isPending ? (
                                    <div className="flex flex-col gap-2">
                                        <Skeleton className='h-8 w-full bg-secondary' />
                                        <Skeleton className='h-8 w-full bg-secondary' />
                                        <Skeleton className='h-8 w-full bg-secondary' />
                                        <Skeleton className='h-8 w-full bg-secondary' />
                                    </div>
                                ) : (
                                    <>
                                        {limitedChannels.map((channel: ChannelType) => {
                                            const icon = getChannelIcon(channel.type);

                                            return (
                                                <SidebarMenuItem key={channel.id}>
                                                    <SidebarMenuButton
                                                        asChild
                                                        tooltip={`Connect ${channel.name}`}
                                                    >
                                                        <button
                                                            className='w-full flex items-center gap-2'
                                                        >
                                                            <span>
                                                                <div className='relative'>
                                                                    {icon ? (
                                                                        <HugeiconsIcon icon={icon} color='currentColor'
                                                                            className=" text-white! size-6! p-1 rounded-sm"
                                                                            style={{ background: channel.color }}
                                                                        />
                                                                    ) : null}

                                                                    <div className={`absolute -right-1 bottom-0 p-0.5
                                 bg-white dark:bg-background rounded-xs
                                `}>
                                                                        <HugeiconsIcon icon={PlusSignIcon} className="size-2!" />
                                                                    </div>
                                                                </div>
                                                            </span>
                                                            <span className='truncate'>{channel.name}</span>
                                                        </button>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            )
                                        })}

                                        {/* FIXED: Removed double asChild/Button wrapper and correctly wrapped children in Link */}
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild tooltip="More Channels">
                                                <Link href="/settings" className='w-full flex items-center gap-2 mt-1'>
                                                    <PlusCircleIcon className='size-4' />
                                                    <span className='truncate'>More Channels</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </>
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                </SidebarContent>
                <SidebarFooter>
                    <div className="mb-3 text-xs text-muted-foreground">
                        <span>
                            {connectedCount}/{totalChannels} channels connected
                        </span>
                    </div>
                    <div>
                        <UserButton
                            showName={true}
                            appearance={{
                                elements: {
                                    avatarBox: "h-8 w-8",
                                },
                            }}
                        />
                    </div>
                </SidebarFooter>
            </Sidebar>
        </>
    )
}

export default AppSidebar