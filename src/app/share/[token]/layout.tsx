import { Metadata } from 'next';
import prisma from '@/lib/db';

type Props = {
  params: { token: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const shareLink = await prisma.shareLink.findUnique({
      where: { token: params.token },
      include: {
        project: {
          select: {
            name: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    if (!shareLink) {
      return {
        title: 'Shared Relief | ReliefForge',
        description: 'View a shared 3D relief panel',
      };
    }

    const projectName = shareLink.project.name || 'Untitled Project';
    const baseUrl = process.env.NEXTAUTH_URL || 'https://reliefforge.com';

    return {
      title: `${projectName} | ReliefForge`,
      description: '3D relief panel created with ReliefForge — convert images to printable relief panels',
      openGraph: {
        title: `${projectName} | ReliefForge`,
        description: '3D relief panel created with ReliefForge — convert images to printable relief panels',
        type: 'website',
        url: `${baseUrl}/share/${params.token}`,
        images: shareLink.project.thumbnailUrl
          ? [
              {
                url: shareLink.project.thumbnailUrl,
                width: 1200,
                height: 630,
                alt: projectName,
              },
            ]
          : [
              {
                url: `${baseUrl}/og-default.png`,
                width: 1200,
                height: 630,
                alt: 'ReliefForge',
              },
            ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${projectName} | ReliefForge`,
        description: '3D relief panel created with ReliefForge',
        images: shareLink.project.thumbnailUrl || `${baseUrl}/og-default.png`,
      },
    };
  } catch {
    return {
      title: 'Shared Relief | ReliefForge',
      description: 'View a shared 3D relief panel',
    };
  }
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
