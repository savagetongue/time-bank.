export interface Member {
  id: number;
  name: string;
  rating: number;
  avatarUrl: string;
}
export interface Offer {
  id: number;
  provider: Member;
  title: string;
  description: string;
  skills: string[];
  ratePerHour: number;
  isActive: boolean;
}
export const mockMembers: Member[] = [
  { id: 1, name: 'Alice', rating: 4.8, avatarUrl: 'https://i.pravatar.cc/150?u=alice' },
  { id: 2, name: 'Bob', rating: 4.5, avatarUrl: 'https://i.pravatar.cc/150?u=bob' },
  { id: 3, name: 'Charlie', rating: 4.9, avatarUrl: 'https://i.pravatar.cc/150?u=charlie' },
];
export const mockOffers: Offer[] = [
  {
    id: 1,
    provider: mockMembers[0],
    title: 'Professional Web Design',
    description: 'Crafting beautiful, modern, and responsive websites from scratch. Let\'s build your online presence together.',
    skills: ['React', 'TailwindCSS', 'Figma'],
    ratePerHour: 2.0,
    isActive: true,
  },
  {
    id: 2,
    provider: mockMembers[1],
    title: 'Garden Maintenance',
    description: 'Weekly or bi-weekly garden care, including mowing, weeding, and planting. Keep your garden looking its best.',
    skills: ['Gardening', 'Landscaping'],
    ratePerHour: 1.0,
    isActive: true,
  },
  {
    id: 3,
    provider: mockMembers[2],
    title: 'Personalized Guitar Lessons',
    description: 'Learn guitar from a seasoned musician. All levels welcome, from absolute beginners to advanced players.',
    skills: ['Music', 'Guitar', 'Teaching'],
    ratePerHour: 1.5,
    isActive: true,
  },
  {
    id: 4,
    provider: mockMembers[0],
    title: 'Cloudflare Worker Backend API',
    description: 'Build scalable, serverless backends with Cloudflare Workers. Fast, secure, and cost-effective.',
    skills: ['Hono', 'TypeScript', 'Serverless'],
    ratePerHour: 2.5,
    isActive: true,
  },
  {
    id: 5,
    provider: mockMembers[2],
    title: 'Professional Music Production',
    description: 'Full music production services, from recording and mixing to mastering your next hit song.',
    skills: ['Music Production', 'Audio Engineering', 'Ableton Live'],
    ratePerHour: 3.0,
    isActive: true,
  },
  {
    id: 6,
    provider: mockMembers[1],
    title: 'Handyman Services',
    description: 'General home repairs and maintenance. No job is too small. Shelving, painting, minor plumbing, and more.',
    skills: ['Home Repair', 'Plumbing', 'Painting'],
    ratePerHour: 0.75,
    isActive: false,
  },
];