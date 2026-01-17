import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Globe,
  FileText,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Copy,
  Eye,
  TrendingUp,
  Image,
  Code,
  Share2,
  Loader2,
  Sparkles,
  Send,
  ListChecks,
  Rocket,
  Circle,
  CheckCircle2,
  MessageSquare,
  Target,
  Zap,
  Users,
  Hash,
  AtSign,
  BarChart3,
  Lightbulb
} from 'lucide-react';

interface SEOCheckResult {
  category: string;
  item: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  recommendation?: string;
}

interface MetaTagInfo {
  name: string;
  content: string;
  type: 'meta' | 'og' | 'twitter' | 'link';
}

interface ChecklistItem {
  id: string;
  task: string;
  description: string;
  category: 'setup' | 'submission' | 'social' | 'technical';
  link?: string;
}

interface AIRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
}

const CHECKLIST_STORAGE_KEY = 'kiwi_seo_checklist';

const SEODashboard: React.FC = () => {
  const [seoChecks, setSeoChecks] = useState<SEOCheckResult[]>([]);
  const [metaTags, setMetaTags] = useState<MetaTagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'meta' | 'social' | 'technical' | 'tools' | 'search-preview' | 'submit' | 'ai-assist'>('overview');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');

  const siteUrl = 'https://www.kiwimealplanner.co.nz';
  const siteName = 'Kiwi Meal Planner';

  // Checklist items
  const checklistItems: ChecklistItem[] = [
    // Setup
    { id: 'search-console-setup', task: 'Set up Google Search Console', description: 'Create account and add your property', category: 'setup', link: 'https://search.google.com/search-console' },
    { id: 'verify-ownership', task: 'Verify site ownership', description: 'Complete domain verification in Search Console', category: 'setup' },
    { id: 'analytics-setup', task: 'Set up Google Analytics', description: 'Install GA4 tracking code', category: 'setup', link: 'https://analytics.google.com' },
    { id: 'bing-webmaster', task: 'Set up Bing Webmaster Tools', description: 'Add site to Bing for broader reach', category: 'setup', link: 'https://www.bing.com/webmasters' },

    // Submission
    { id: 'submit-sitemap-google', task: 'Submit sitemap to Google', description: 'Submit sitemap.xml in Search Console', category: 'submission' },
    { id: 'submit-sitemap-bing', task: 'Submit sitemap to Bing', description: 'Submit sitemap in Bing Webmaster', category: 'submission' },
    { id: 'request-indexing', task: 'Request URL indexing', description: 'Use URL Inspection tool for key pages', category: 'submission' },

    // Social
    { id: 'facebook-page', task: 'Create Facebook Business Page', description: 'Set up official Facebook presence', category: 'social', link: 'https://www.facebook.com/pages/create' },
    { id: 'instagram-account', task: 'Create Instagram Account', description: 'Set up Instagram for food content', category: 'social', link: 'https://www.instagram.com' },
    { id: 'pinterest-account', task: 'Create Pinterest Business Account', description: 'Great for recipe sharing', category: 'social', link: 'https://business.pinterest.com' },
    { id: 'test-og-tags', task: 'Test Open Graph tags', description: 'Verify social previews work correctly', category: 'social', link: 'https://developers.facebook.com/tools/debug/' },
    { id: 'test-twitter-cards', task: 'Test Twitter Cards', description: 'Verify Twitter share appearance', category: 'social', link: 'https://cards-dev.twitter.com/validator' },

    // Technical
    { id: 'robots-txt', task: 'Verify robots.txt', description: 'Ensure crawlers can access the site', category: 'technical' },
    { id: 'canonical-urls', task: 'Set canonical URLs', description: 'Prevent duplicate content issues', category: 'technical' },
    { id: 'structured-data', task: 'Add structured data', description: 'Implement JSON-LD for rich snippets', category: 'technical' },
    { id: 'mobile-friendly', task: 'Test mobile-friendliness', description: 'Ensure responsive design works', category: 'technical', link: 'https://search.google.com/test/mobile-friendly' },
    { id: 'page-speed', task: 'Optimize page speed', description: 'Check and improve Core Web Vitals', category: 'technical', link: 'https://pagespeed.web.dev' },
    { id: 'https-enabled', task: 'Enable HTTPS', description: 'Secure connection required for SEO', category: 'technical' },
    { id: 'www-redirect', task: 'Configure www redirect', description: 'Redirect non-www to www (or vice versa)', category: 'technical' },
  ];

  // Search engine submission links
  const searchEngines = [
    {
      name: 'Google Search Console',
      description: 'Primary search engine - submit sitemap and monitor performance',
      url: 'https://search.google.com/search-console',
      icon: '🔍',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      submitUrl: 'https://search.google.com/search-console/sitemaps'
    },
    {
      name: 'Bing Webmaster Tools',
      description: 'Microsoft search engine - also powers Yahoo search',
      url: 'https://www.bing.com/webmasters',
      icon: '🅱️',
      color: 'bg-teal-50 border-teal-200 text-teal-700',
      submitUrl: 'https://www.bing.com/webmasters/sitemaps'
    },
    {
      name: 'Yandex Webmaster',
      description: 'Popular in Russia and Eastern Europe',
      url: 'https://webmaster.yandex.com',
      icon: '🔴',
      color: 'bg-red-50 border-red-200 text-red-700',
      submitUrl: 'https://webmaster.yandex.com/sites/add/'
    },
    {
      name: 'DuckDuckGo',
      description: 'Privacy-focused search - uses Bing index',
      url: 'https://duckduckgo.com',
      icon: '🦆',
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      submitUrl: null // Uses Bing
    },
    {
      name: 'IndexNow',
      description: 'Instant indexing protocol for Bing, Yandex & more',
      url: 'https://www.indexnow.org',
      icon: '⚡',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      submitUrl: 'https://www.indexnow.org/documentation'
    }
  ];

  // Load checklist state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (saved) {
      setChecklistState(JSON.parse(saved));
    }
  }, []);

  // Save checklist state to localStorage
  const toggleChecklistItem = (id: string) => {
    const newState = { ...checklistState, [id]: !checklistState[id] };
    setChecklistState(newState);
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(newState));
  };

  useEffect(() => {
    runSEOChecks();
  }, []);

  const runSEOChecks = () => {
    setLoading(true);

    const checks: SEOCheckResult[] = [
      // Title checks
      {
        category: 'Title',
        item: 'Page Title',
        status: document.title.length > 30 && document.title.length < 60 ? 'pass' : document.title.length > 60 ? 'warning' : 'fail',
        message: `Title length: ${document.title.length} characters`,
        recommendation: 'Ideal title length is 50-60 characters'
      },
      {
        category: 'Title',
        item: 'Title Keywords',
        status: document.title.toLowerCase().includes('meal') && document.title.toLowerCase().includes('planner') ? 'pass' : 'warning',
        message: document.title.includes('Kiwi Meal Planner') ? 'Brand name present in title' : 'Brand name missing',
        recommendation: 'Include primary keywords and brand name in title'
      },

      // Meta Description
      {
        category: 'Meta',
        item: 'Meta Description',
        status: getMetaContent('description')?.length ? (getMetaContent('description')!.length > 120 && getMetaContent('description')!.length < 160 ? 'pass' : 'warning') : 'fail',
        message: getMetaContent('description') ? `Description length: ${getMetaContent('description')!.length} characters` : 'No meta description found',
        recommendation: 'Ideal description length is 150-160 characters'
      },
      {
        category: 'Meta',
        item: 'Meta Keywords',
        status: getMetaContent('keywords') ? 'pass' : 'warning',
        message: getMetaContent('keywords') ? 'Keywords meta tag present' : 'No keywords meta tag',
        recommendation: 'Add relevant keywords for search context'
      },
      {
        category: 'Meta',
        item: 'Canonical URL',
        status: document.querySelector('link[rel="canonical"]') ? 'pass' : 'fail',
        message: document.querySelector('link[rel="canonical"]') ? 'Canonical URL is set' : 'Missing canonical URL',
        recommendation: 'Set canonical URL to prevent duplicate content issues'
      },
      {
        category: 'Meta',
        item: 'Robots Meta',
        status: getMetaContent('robots')?.includes('index') ? 'pass' : 'warning',
        message: getMetaContent('robots') || 'No robots meta tag (defaults to index, follow)',
        recommendation: 'Explicitly set robots directive'
      },

      // Open Graph
      {
        category: 'Social',
        item: 'OG Title',
        status: getMetaProperty('og:title') ? 'pass' : 'fail',
        message: getMetaProperty('og:title') ? 'Open Graph title set' : 'Missing OG title',
        recommendation: 'Add og:title for social sharing'
      },
      {
        category: 'Social',
        item: 'OG Description',
        status: getMetaProperty('og:description') ? 'pass' : 'fail',
        message: getMetaProperty('og:description') ? 'Open Graph description set' : 'Missing OG description',
        recommendation: 'Add og:description for social sharing'
      },
      {
        category: 'Social',
        item: 'OG Image',
        status: getMetaProperty('og:image') ? 'pass' : 'fail',
        message: getMetaProperty('og:image') ? 'Open Graph image set' : 'Missing OG image',
        recommendation: 'Add 1200x630px image for optimal social sharing'
      },
      {
        category: 'Social',
        item: 'Twitter Card',
        status: getMetaContent('twitter:card') ? 'pass' : 'warning',
        message: getMetaContent('twitter:card') ? `Twitter card type: ${getMetaContent('twitter:card')}` : 'Missing Twitter card',
        recommendation: 'Add Twitter card for better Twitter sharing'
      },

      // Technical
      {
        category: 'Technical',
        item: 'Viewport Meta',
        status: getMetaContent('viewport') ? 'pass' : 'fail',
        message: getMetaContent('viewport') ? 'Viewport configured for mobile' : 'Missing viewport meta',
        recommendation: 'Essential for mobile responsiveness'
      },
      {
        category: 'Technical',
        item: 'Language',
        status: document.documentElement.lang ? 'pass' : 'warning',
        message: document.documentElement.lang ? `Language: ${document.documentElement.lang}` : 'No lang attribute',
        recommendation: 'Set lang attribute for accessibility and SEO'
      },
      {
        category: 'Technical',
        item: 'Structured Data',
        status: document.querySelector('script[type="application/ld+json"]') ? 'pass' : 'warning',
        message: document.querySelector('script[type="application/ld+json"]') ? 'JSON-LD structured data found' : 'No structured data',
        recommendation: 'Add Schema.org markup for rich snippets'
      },
      {
        category: 'Technical',
        item: 'HTTPS',
        status: window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'pass' : 'fail',
        message: window.location.protocol === 'https:' ? 'Site uses HTTPS' : 'Site not using HTTPS',
        recommendation: 'HTTPS is required for security and SEO'
      },

      // PWA
      {
        category: 'PWA',
        item: 'Manifest',
        status: document.querySelector('link[rel="manifest"]') ? 'pass' : 'warning',
        message: document.querySelector('link[rel="manifest"]') ? 'Web manifest present' : 'No web manifest',
        recommendation: 'Add manifest for PWA installability'
      },
      {
        category: 'PWA',
        item: 'Theme Color',
        status: getMetaContent('theme-color') ? 'pass' : 'warning',
        message: getMetaContent('theme-color') ? `Theme color: ${getMetaContent('theme-color')}` : 'No theme color',
        recommendation: 'Set theme color for browser UI'
      },
      {
        category: 'PWA',
        item: 'Apple Touch Icon',
        status: document.querySelector('link[rel="apple-touch-icon"]') ? 'pass' : 'warning',
        message: document.querySelector('link[rel="apple-touch-icon"]') ? 'Apple touch icon set' : 'Missing apple touch icon',
        recommendation: 'Add apple-touch-icon for iOS'
      }
    ];

    setSeoChecks(checks);

    // Extract all meta tags
    const tags: MetaTagInfo[] = [];
    document.querySelectorAll('meta[name]').forEach((meta) => {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (name && content) tags.push({ name, content, type: 'meta' });
    });
    document.querySelectorAll('meta[property^="og:"]').forEach((meta) => {
      const name = meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) tags.push({ name, content, type: 'og' });
    });
    document.querySelectorAll('meta[name^="twitter:"]').forEach((meta) => {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (name && content) tags.push({ name, content, type: 'twitter' });
    });

    setMetaTags(tags);
    setLoading(false);
  };

  const getMetaContent = (name: string): string | null => {
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta?.getAttribute('content') || null;
  };

  const getMetaProperty = (property: string): string | null => {
    const meta = document.querySelector(`meta[property="${property}"]`);
    return meta?.getAttribute('content') || null;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass': return <CheckCircle className="text-emerald-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'fail': return <AlertTriangle className="text-red-500" size={18} />;
    }
  };

  const getStatusColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass': return 'bg-emerald-50 border-emerald-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'fail': return 'bg-red-50 border-red-200';
    }
  };

  // Generate AI recommendations
  const generateAIRecommendations = async () => {
    setAiLoading(true);

    // Simulated AI recommendations based on current site analysis
    await new Promise(resolve => setTimeout(resolve, 1500));

    const recommendations: AIRecommendation[] = [
      {
        category: 'Content Strategy',
        title: 'Create a Recipe Blog Section',
        description: 'Adding a blog with SEO-optimized recipe content can significantly boost organic traffic. Focus on long-tail keywords like "easy weeknight dinner recipes NZ" or "healthy meal prep ideas".',
        priority: 'high',
        actionItems: [
          'Create a /blog route for recipe articles',
          'Write 5-10 foundational recipe posts',
          'Target long-tail keywords with low competition',
          'Add internal links to main app features'
        ]
      },
      {
        category: 'Local SEO',
        title: 'Enhance NZ-Specific Keywords',
        description: 'Your site targets New Zealand but could better leverage local search intent. Add more NZ-specific terms and local business schema.',
        priority: 'high',
        actionItems: [
          'Add "New Zealand" to key page titles',
          'Include NZ supermarket names (Countdown, New World, Pak\'nSave)',
          'Add LocalBusiness schema markup',
          'Create content around NZ seasonal produce'
        ]
      },
      {
        category: 'Social Media',
        title: 'Pinterest Marketing Strategy',
        description: 'Pinterest is highly effective for recipe and meal planning content. Create visually appealing pins that link back to your app.',
        priority: 'medium',
        actionItems: [
          'Set up Pinterest Business account',
          'Create recipe pin templates (1000x1500px)',
          'Pin 5-10 recipe images weekly',
          'Join group boards for food/recipes'
        ]
      },
      {
        category: 'Technical SEO',
        title: 'Implement Breadcrumb Navigation',
        description: 'Adding breadcrumb structured data helps search engines understand your site hierarchy and can improve click-through rates.',
        priority: 'medium',
        actionItems: [
          'Add BreadcrumbList schema to pages',
          'Display visual breadcrumbs in UI',
          'Ensure proper hierarchy (Home > Category > Page)'
        ]
      },
      {
        category: 'User Engagement',
        title: 'Add Recipe Reviews & Ratings',
        description: 'User-generated reviews create fresh content and enable Review schema markup, potentially showing star ratings in search results.',
        priority: 'medium',
        actionItems: [
          'Allow users to rate recipes 1-5 stars',
          'Enable written reviews for saved recipes',
          'Implement AggregateRating schema',
          'Display average ratings on recipe cards'
        ]
      },
      {
        category: 'Performance',
        title: 'Optimize Core Web Vitals',
        description: 'Page speed is a ranking factor. Focus on Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) improvements.',
        priority: 'low',
        actionItems: [
          'Lazy load images below the fold',
          'Preload critical fonts',
          'Add explicit dimensions to images',
          'Consider server-side rendering for landing page'
        ]
      }
    ];

    setAiRecommendations(recommendations);
    setAiLoading(false);
  };

  // Handle custom AI prompt
  const handleAIPrompt = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate contextual response based on prompt
    const customRecommendation: AIRecommendation = {
      category: 'Custom Analysis',
      title: `Analysis: ${aiPrompt.slice(0, 50)}${aiPrompt.length > 50 ? '...' : ''}`,
      description: `Based on your question about "${aiPrompt}", here are specific recommendations for ${siteName}:`,
      priority: 'high',
      actionItems: [
        'Focus on user intent - understand what your target audience is searching for',
        'Create content that directly answers common questions',
        'Use heading tags (H1-H6) strategically with keywords',
        'Build quality backlinks from NZ food blogs and directories',
        'Monitor Search Console for query opportunities'
      ]
    };

    setAiRecommendations([customRecommendation, ...aiRecommendations.slice(0, 3)]);
    setAiPrompt('');
    setAiLoading(false);
  };

  const passCount = seoChecks.filter(c => c.status === 'pass').length;
  const warningCount = seoChecks.filter(c => c.status === 'warning').length;
  const failCount = seoChecks.filter(c => c.status === 'fail').length;
  const score = seoChecks.length > 0 ? Math.round((passCount / seoChecks.length) * 100) : 0;

  const checklistProgress = {
    total: checklistItems.length,
    completed: Object.values(checklistState).filter(Boolean).length
  };

  const externalTools = [
    { name: 'Google Search Console', description: 'Monitor search performance', url: 'https://search.google.com/search-console', icon: <Search size={20} /> },
    { name: 'PageSpeed Insights', description: 'Analyze page performance', url: `https://pagespeed.web.dev/report?url=${encodeURIComponent(siteUrl)}`, icon: <TrendingUp size={20} /> },
    { name: 'Rich Results Test', description: 'Test structured data', url: `https://search.google.com/test/rich-results?url=${encodeURIComponent(siteUrl)}`, icon: <Code size={20} /> },
    { name: 'Mobile-Friendly Test', description: 'Check responsiveness', url: `https://search.google.com/test/mobile-friendly?url=${encodeURIComponent(siteUrl)}`, icon: <Globe size={20} /> },
    { name: 'Facebook Debugger', description: 'Test OG tags', url: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(siteUrl)}`, icon: <Share2 size={20} /> },
  ];

  const importantUrls = [
    { name: 'Sitemap', url: `${siteUrl}/sitemap.xml` },
    { name: 'Robots.txt', url: `${siteUrl}/robots.txt` },
    { name: 'Manifest', url: `${siteUrl}/manifest.json` }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Score */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <Search className="text-emerald-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">SEO Dashboard</h2>
              <p className="text-sm text-slate-500">Monitor and optimize search engine presence</p>
            </div>
          </div>
          <button
            onClick={runSEOChecks}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
            <div className="text-3xl font-bold text-emerald-600">{score}%</div>
            <div className="text-sm text-emerald-700">SEO Score</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <div className="text-2xl font-bold text-emerald-600">{passCount}</div>
            <div className="text-sm text-emerald-700">Passed</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
            <div className="text-sm text-amber-700">Warnings</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="text-2xl font-bold text-red-600">{failCount}</div>
            <div className="text-sm text-red-700">Issues</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{checklistProgress.completed}/{checklistProgress.total}</div>
            <div className="text-sm text-blue-700">Checklist</div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: <Eye size={16} /> },
          { id: 'search-preview', label: 'Google Preview', icon: <Search size={16} /> },
          { id: 'submit', label: 'Submit', icon: <Rocket size={16} /> },
          { id: 'ai-assist', label: 'AI Assistant', icon: <Sparkles size={16} /> },
          { id: 'social', label: 'Social', icon: <Share2 size={16} /> },
          { id: 'technical', label: 'Technical', icon: <Globe size={16} /> },
          { id: 'tools', label: 'Tools', icon: <ExternalLink size={16} /> }
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === section.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {section.icon}
            <span className="hidden sm:inline">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          {['Title', 'Meta', 'Social', 'Technical', 'PWA'].map((category) => {
            const categoryChecks = seoChecks.filter(c => c.category === category);
            if (categoryChecks.length === 0) return null;
            return (
              <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-700">{category}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {categoryChecks.map((check, idx) => (
                    <div key={idx} className={`p-4 ${getStatusColor(check.status)}`}>
                      <div className="flex items-start gap-3">
                        {getStatusIcon(check.status)}
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{check.item}</div>
                          <div className="text-sm text-slate-600">{check.message}</div>
                          {check.status !== 'pass' && check.recommendation && (
                            <div className="text-sm text-slate-500 mt-1 italic">Tip: {check.recommendation}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Google Search Preview Section */}
      {activeSection === 'search-preview' && (
        <div className="space-y-6">
          {/* Google Search Results Preview */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Search size={20} />
              Google Search Results Preview
            </h3>
            <p className="text-sm text-slate-500 mb-6">This is how your site might appear in Google search results</p>

            {/* Desktop Preview */}
            <div className="mb-6">
              <div className="text-xs font-medium text-slate-500 mb-2 uppercase">Desktop Preview</div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-2xl">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <img src="/icons/icon.svg" alt="favicon" className="w-4 h-4" />
                  <span>{new URL(siteUrl).hostname}</span>
                  <span className="text-slate-400">›</span>
                  <span className="text-slate-500">Home</span>
                </div>
                <a href={siteUrl} className="text-xl text-blue-700 hover:underline font-medium block mb-1">
                  {getMetaProperty('og:title') || document.title}
                </a>
                <p className="text-sm text-slate-600 line-clamp-2">
                  {getMetaContent('description') || 'No description available'}
                </p>
              </div>
            </div>

            {/* Mobile Preview */}
            <div className="mb-6">
              <div className="text-xs font-medium text-slate-500 mb-2 uppercase">Mobile Preview</div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 max-w-sm">
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                  <img src="/icons/icon.svg" alt="favicon" className="w-4 h-4" />
                  <span className="truncate">{new URL(siteUrl).hostname}</span>
                </div>
                <a href={siteUrl} className="text-base text-blue-700 hover:underline font-medium block mb-1 line-clamp-2">
                  {getMetaProperty('og:title') || document.title}
                </a>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {getMetaContent('description') || 'No description available'}
                </p>
              </div>
            </div>

            {/* Rich Snippet Preview */}
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2 uppercase">Potential Rich Snippet (if schema detected)</div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-2xl">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <img src="/icons/icon.svg" alt="favicon" className="w-4 h-4" />
                  <span>{new URL(siteUrl).hostname}</span>
                </div>
                <a href={siteUrl} className="text-xl text-blue-700 hover:underline font-medium block mb-1">
                  {siteName} - AI Meal Planning
                </a>
                <div className="flex items-center gap-2 text-sm text-amber-500 mb-1">
                  {'★'.repeat(5)} <span className="text-slate-500">4.8 (120 reviews)</span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">
                  {getMetaContent('description')}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>✓ Free tier available</span>
                  <span>✓ PWA</span>
                  <span>✓ NZ-focused</span>
                </div>
              </div>
            </div>
          </div>

          {/* Keyword Position Simulator */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 size={20} />
              Target Keywords
            </h3>
            <p className="text-sm text-slate-500 mb-4">Keywords to target for search visibility</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { keyword: 'meal planner nz', volume: 'High', competition: 'Medium' },
                { keyword: 'weekly meal planning', volume: 'High', competition: 'High' },
                { keyword: 'ai meal planner', volume: 'Medium', competition: 'Low' },
                { keyword: 'family meal planning app', volume: 'Medium', competition: 'Medium' },
                { keyword: 'recipe planner new zealand', volume: 'Low', competition: 'Low' },
                { keyword: 'healthy meal prep nz', volume: 'Medium', competition: 'Medium' },
              ].map((kw, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-medium text-slate-800 text-sm">{kw.keyword}</div>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className={`${kw.volume === 'High' ? 'text-emerald-600' : kw.volume === 'Medium' ? 'text-amber-600' : 'text-slate-500'}`}>
                      Vol: {kw.volume}
                    </span>
                    <span className={`${kw.competition === 'Low' ? 'text-emerald-600' : kw.competition === 'Medium' ? 'text-amber-600' : 'text-red-600'}`}>
                      Comp: {kw.competition}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submit Section */}
      {activeSection === 'submit' && (
        <div className="space-y-6">
          {/* Search Engine Submission */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Rocket size={20} />
              Submit to Search Engines
            </h3>
            <p className="text-sm text-slate-500 mb-4">Submit your sitemap to major search engines for faster indexing</p>

            <div className="grid gap-4">
              {searchEngines.map((engine, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${engine.color}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{engine.icon}</span>
                      <div>
                        <div className="font-semibold">{engine.name}</div>
                        <div className="text-sm opacity-80">{engine.description}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {engine.submitUrl && (
                        <a
                          href={engine.submitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white/80 hover:bg-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                        >
                          Submit <ExternalLink size={14} />
                        </a>
                      )}
                      <a
                        href={engine.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white/50 hover:bg-white/80 rounded-lg text-sm flex items-center gap-1 transition-colors"
                      >
                        Open <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sitemap URL Copy */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm font-medium text-slate-700 mb-2">Your Sitemap URL</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white rounded border text-sm text-slate-600 font-mono">
                  {siteUrl}/sitemap.xml
                </code>
                <button
                  onClick={() => copyToClipboard(`${siteUrl}/sitemap.xml`, 'sitemap-submit')}
                  className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                >
                  {copiedItem === 'sitemap-submit' ? <CheckCircle size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <ListChecks size={20} />
                SEO Launch Checklist
              </h3>
              <div className="text-sm text-slate-500">
                {checklistProgress.completed} of {checklistProgress.total} completed
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(checklistProgress.completed / checklistProgress.total) * 100}%` }}
              />
            </div>

            {/* Checklist by Category */}
            {['setup', 'submission', 'social', 'technical'].map((category) => {
              const items = checklistItems.filter(i => i.category === category);
              const categoryLabels: Record<string, string> = {
                setup: 'Account Setup',
                submission: 'Search Submission',
                social: 'Social Media',
                technical: 'Technical SEO'
              };

              return (
                <div key={category} className="mb-6">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{categoryLabels[category]}</div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                          checklistState[item.id] ? 'bg-emerald-50' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => toggleChecklistItem(item.id)}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          checklistState[item.id]
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-300'
                        }`}>
                          {checklistState[item.id] && <CheckCircle2 className="text-white" size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${checklistState[item.id] ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                            {item.task}
                          </div>
                          <div className="text-sm text-slate-500">{item.description}</div>
                        </div>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition-colors"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Assistant Section */}
      {activeSection === 'ai-assist' && (
        <div className="space-y-6">
          {/* AI Prompt Input */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
            <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <Sparkles size={20} />
              AI SEO & Social Media Assistant
            </h3>
            <p className="text-sm text-purple-600 mb-4">Get personalized recommendations to improve your search rankings and social presence</p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask anything about SEO or social media strategy..."
                className="flex-1 px-4 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleAIPrompt()}
              />
              <button
                onClick={handleAIPrompt}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                {aiLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {['How can I rank higher for "meal planner NZ"?', 'Best social media strategy for recipe apps', 'How to get more backlinks?'].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiPrompt(suggestion)}
                  className="px-3 py-1.5 text-sm bg-white/70 hover:bg-white text-purple-700 rounded-full border border-purple-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Recommendations Button */}
          {aiRecommendations.length === 0 && !aiLoading && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Lightbulb className="mx-auto mb-4 text-amber-500" size={48} />
              <h3 className="font-semibold text-slate-700 mb-2">Get AI-Powered Recommendations</h3>
              <p className="text-sm text-slate-500 mb-4">Analyze your site and get personalized suggestions to improve SEO and social media presence</p>
              <button
                onClick={generateAIRecommendations}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
              >
                <Sparkles size={18} />
                Generate Recommendations
              </button>
            </div>
          )}

          {/* Loading State */}
          {aiLoading && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Loader2 className="mx-auto mb-4 text-purple-600 animate-spin" size={48} />
              <p className="text-slate-600">Analyzing your site and generating recommendations...</p>
            </div>
          )}

          {/* Recommendations Display */}
          {aiRecommendations.length > 0 && !aiLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">AI Recommendations</h3>
                <button
                  onClick={generateAIRecommendations}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>
              </div>

              {aiRecommendations.map((rec, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className={`px-4 py-3 border-b ${
                    rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                    rec.priority === 'medium' ? 'bg-amber-50 border-amber-200' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {rec.priority.toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-500">{rec.category}</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-slate-800 mt-1">{rec.title}</h4>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-slate-600 mb-3">{rec.description}</p>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-700">Action Items:</div>
                      {rec.actionItems.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-start gap-2 text-sm text-slate-600">
                          <Zap className="text-amber-500 flex-shrink-0 mt-0.5" size={14} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Social Section */}
      {activeSection === 'social' && (
        <div className="space-y-4">
          {/* Open Graph */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
              <h3 className="font-semibold text-blue-700">Open Graph Tags (Facebook/LinkedIn)</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {metaTags.filter(t => t.type === 'og').map((tag, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-blue-600">{tag.name}</div>
                      <div className="text-sm text-slate-600 break-words mt-1">
                        {tag.name === 'og:image' ? (
                          <a href={tag.content} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                            <Image size={14} /> View Image
                          </a>
                        ) : tag.content}
                      </div>
                    </div>
                    <button onClick={() => copyToClipboard(tag.content, `og-${idx}`)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                      {copiedItem === `og-${idx}` ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Twitter */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-sky-50 px-4 py-3 border-b border-sky-200">
              <h3 className="font-semibold text-sky-700">Twitter Card Tags</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {metaTags.filter(t => t.type === 'twitter').map((tag, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-sky-600">{tag.name}</div>
                      <div className="text-sm text-slate-600 break-words mt-1">{tag.content}</div>
                    </div>
                    <button onClick={() => copyToClipboard(tag.content, `tw-${idx}`)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                      {copiedItem === `tw-${idx}` ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Preview */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-4">Social Share Preview</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Facebook Preview */}
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">Facebook</div>
                <div className="bg-slate-100 rounded-lg p-3">
                  <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                    {getMetaProperty('og:image') && (
                      <div className="aspect-[1200/630] bg-slate-200">
                        <img src={getMetaProperty('og:image') || ''} alt="OG Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="text-xs text-slate-500 uppercase">{new URL(siteUrl).hostname}</div>
                      <div className="font-semibold text-slate-800 line-clamp-2">{getMetaProperty('og:title') || document.title}</div>
                      <div className="text-sm text-slate-500 line-clamp-2">{getMetaProperty('og:description')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Twitter Preview */}
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">Twitter</div>
                <div className="bg-slate-100 rounded-lg p-3">
                  <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    {getMetaProperty('og:image') && (
                      <div className="aspect-[2/1] bg-slate-200">
                        <img src={getMetaProperty('og:image') || ''} alt="Twitter Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="font-semibold text-slate-800 line-clamp-1">{getMetaContent('twitter:title') || document.title}</div>
                      <div className="text-sm text-slate-500 line-clamp-2">{getMetaContent('twitter:description')}</div>
                      <div className="text-xs text-slate-400 mt-1">{new URL(siteUrl).hostname}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Section */}
      {activeSection === 'technical' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-4">Important SEO Files</h3>
            <div className="space-y-3">
              {importantUrls.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-slate-400" size={20} />
                    <div>
                      <div className="font-medium text-slate-700">{item.name}</div>
                      <div className="text-sm text-slate-500 font-mono">{item.url}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(item.url, `url-${idx}`)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded" title="Copy URL">
                      {copiedItem === `url-${idx}` ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded" title="Open">
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Structured Data */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
              <h3 className="font-semibold text-purple-700">Structured Data (JSON-LD)</h3>
            </div>
            <div className="p-4">
              {document.querySelectorAll('script[type="application/ld+json"]').length > 0 ? (
                <div className="space-y-4">
                  {Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((script, idx) => {
                    let json: any = {};
                    try { json = JSON.parse(script.textContent || '{}'); } catch {}
                    return (
                      <div key={idx} className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="text-purple-500" size={16} />
                          <span className="font-medium text-slate-700">{json['@type'] || 'Unknown Type'}</span>
                        </div>
                        <pre className="text-xs bg-slate-800 text-slate-100 p-3 rounded overflow-x-auto">{JSON.stringify(json, null, 2)}</pre>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Code className="mx-auto mb-2 text-slate-300" size={32} />
                  <p>No structured data found</p>
                </div>
              )}
            </div>
          </div>

          {/* Technical Checks */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-700">Technical SEO Checks</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {seoChecks.filter(c => c.category === 'Technical' || c.category === 'PWA').map((check, idx) => (
                <div key={idx} className={`p-4 ${getStatusColor(check.status)}`}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{check.item}</div>
                      <div className="text-sm text-slate-600">{check.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tools Section */}
      {activeSection === 'tools' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-4">External SEO Tools</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {externalTools.map((tool, idx) => (
                <a key={idx} href={tool.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-600">{tool.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 flex items-center gap-2">{tool.name} <ExternalLink size={14} className="text-slate-400" /></div>
                    <div className="text-sm text-slate-500">{tool.description}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-4">Quick Actions</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <button onClick={() => copyToClipboard(`${siteUrl}/sitemap.xml`, 'sitemap-copy')} className="flex items-center justify-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors">
                {copiedItem === 'sitemap-copy' ? <CheckCircle size={18} /> : <Copy size={18} />}
                Copy Sitemap URL
              </button>
              <button onClick={() => window.open(`https://search.google.com/search-console`, '_blank')} className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors">
                <Search size={18} />
                Open Search Console
              </button>
              <button onClick={() => window.open(`https://www.google.com/search?q=site:${encodeURIComponent(new URL(siteUrl).hostname)}`, '_blank')} className="flex items-center justify-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors">
                <Globe size={18} />
                Check Indexed Pages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SEODashboard;
