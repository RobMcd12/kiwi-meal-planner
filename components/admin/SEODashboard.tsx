import React, { useState, useEffect } from 'react';
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
  Link2,
  Image,
  Code,
  Share2,
  Bot,
  MapPin,
  Clock,
  Loader2
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

const SEODashboard: React.FC = () => {
  const [seoChecks, setSeoChecks] = useState<SEOCheckResult[]>([]);
  const [metaTags, setMetaTags] = useState<MetaTagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'meta' | 'social' | 'technical' | 'tools'>('overview');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const siteUrl = 'https://www.kiwimealplanner.co.nz';

  useEffect(() => {
    runSEOChecks();
  }, []);

  const runSEOChecks = () => {
    setLoading(true);

    // Simulate checking current meta tags from document
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

    // Extract all meta tags for display
    const tags: MetaTagInfo[] = [];

    // Regular meta tags
    document.querySelectorAll('meta[name]').forEach((meta) => {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (name && content) {
        tags.push({ name, content, type: 'meta' });
      }
    });

    // Open Graph tags
    document.querySelectorAll('meta[property^="og:"]').forEach((meta) => {
      const name = meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        tags.push({ name, content, type: 'og' });
      }
    });

    // Twitter tags
    document.querySelectorAll('meta[name^="twitter:"]').forEach((meta) => {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (name && content) {
        tags.push({ name, content, type: 'twitter' });
      }
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
      case 'pass':
        return <CheckCircle className="text-emerald-500" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500" size={18} />;
      case 'fail':
        return <AlertTriangle className="text-red-500" size={18} />;
    }
  };

  const getStatusColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'bg-emerald-50 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
    }
  };

  const passCount = seoChecks.filter(c => c.status === 'pass').length;
  const warningCount = seoChecks.filter(c => c.status === 'warning').length;
  const failCount = seoChecks.filter(c => c.status === 'fail').length;
  const score = seoChecks.length > 0 ? Math.round((passCount / seoChecks.length) * 100) : 0;

  const externalTools = [
    {
      name: 'Google Search Console',
      description: 'Monitor search performance and submit sitemap',
      url: 'https://search.google.com/search-console',
      icon: <Search size={20} />
    },
    {
      name: 'PageSpeed Insights',
      description: 'Analyze page performance and Core Web Vitals',
      url: `https://pagespeed.web.dev/report?url=${encodeURIComponent(siteUrl)}`,
      icon: <TrendingUp size={20} />
    },
    {
      name: 'Rich Results Test',
      description: 'Test structured data for rich snippets',
      url: `https://search.google.com/test/rich-results?url=${encodeURIComponent(siteUrl)}`,
      icon: <Code size={20} />
    },
    {
      name: 'Mobile-Friendly Test',
      description: 'Check mobile responsiveness',
      url: `https://search.google.com/test/mobile-friendly?url=${encodeURIComponent(siteUrl)}`,
      icon: <Globe size={20} />
    },
    {
      name: 'Facebook Debugger',
      description: 'Test and debug Open Graph tags',
      url: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(siteUrl)}`,
      icon: <Share2 size={20} />
    },
    {
      name: 'Twitter Card Validator',
      description: 'Test Twitter Card appearance',
      url: 'https://cards-dev.twitter.com/validator',
      icon: <Share2 size={20} />
    }
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: <Eye size={16} /> },
          { id: 'meta', label: 'Meta Tags', icon: <Code size={16} /> },
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
            {section.label}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          {/* Group checks by category */}
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
                            <div className="text-sm text-slate-500 mt-1 italic">
                              Tip: {check.recommendation}
                            </div>
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

      {/* Meta Tags Section */}
      {activeSection === 'meta' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-700">Current Meta Tags</h3>
            <p className="text-sm text-slate-500">All meta tags detected on this page</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {metaTags.filter(t => t.type === 'meta').map((tag, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-emerald-600">{tag.name}</div>
                    <div className="text-sm text-slate-600 break-words mt-1">{tag.content}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(tag.content, `meta-${idx}`)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    title="Copy"
                  >
                    {copiedItem === `meta-${idx}` ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                        ) : (
                          tag.content
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(tag.content, `og-${idx}`)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
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
                    <button
                      onClick={() => copyToClipboard(tag.content, `tw-${idx}`)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
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
            <div className="bg-slate-100 rounded-lg p-4 max-w-md">
              <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                {getMetaProperty('og:image') && (
                  <div className="aspect-[1200/630] bg-slate-200 flex items-center justify-center">
                    <img
                      src={getMetaProperty('og:image') || ''}
                      alt="OG Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-3">
                  <div className="text-xs text-slate-500 uppercase">{new URL(siteUrl).hostname}</div>
                  <div className="font-semibold text-slate-800 line-clamp-2">
                    {getMetaProperty('og:title') || document.title}
                  </div>
                  <div className="text-sm text-slate-500 line-clamp-2">
                    {getMetaProperty('og:description') || getMetaContent('description')}
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
          {/* Important URLs */}
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
                    <button
                      onClick={() => copyToClipboard(item.url, `url-${idx}`)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                      title="Copy URL"
                    >
                      {copiedItem === `url-${idx}` ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                      title="Open"
                    >
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
                    try {
                      json = JSON.parse(script.textContent || '{}');
                    } catch {}
                    return (
                      <div key={idx} className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="text-purple-500" size={16} />
                          <span className="font-medium text-slate-700">
                            {json['@type'] || 'Unknown Type'}
                          </span>
                        </div>
                        <pre className="text-xs bg-slate-800 text-slate-100 p-3 rounded overflow-x-auto">
                          {JSON.stringify(json, null, 2)}
                        </pre>
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
                <a
                  key={idx}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-600">
                    {tool.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      {tool.name}
                      <ExternalLink size={14} className="text-slate-400" />
                    </div>
                    <div className="text-sm text-slate-500">{tool.description}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-4">Quick Actions</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => copyToClipboard(`${siteUrl}/sitemap.xml`, 'sitemap-copy')}
                className="flex items-center justify-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
              >
                {copiedItem === 'sitemap-copy' ? <CheckCircle size={18} /> : <Copy size={18} />}
                Copy Sitemap URL
              </button>
              <button
                onClick={() => window.open(`https://search.google.com/search-console`, '_blank')}
                className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
              >
                <Search size={18} />
                Open Search Console
              </button>
              <button
                onClick={() => window.open(`https://www.google.com/search?q=site:${encodeURIComponent(new URL(siteUrl).hostname)}`, '_blank')}
                className="flex items-center justify-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors"
              >
                <Globe size={18} />
                Check Indexed Pages
              </button>
            </div>
          </div>

          {/* SEO Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-4">Launch SEO Checklist</h3>
            <div className="space-y-2">
              {[
                { task: 'Submit sitemap to Google Search Console', done: false },
                { task: 'Verify site ownership in Search Console', done: false },
                { task: 'Set up Google Analytics', done: false },
                { task: 'Test all social share previews', done: false },
                { task: 'Check mobile-friendliness', done: false },
                { task: 'Verify robots.txt allows crawling', done: true },
                { task: 'Ensure canonical URLs are set', done: true },
                { task: 'Add structured data (JSON-LD)', done: true },
                { task: 'Configure www to non-www redirect', done: false },
                { task: 'Enable HTTPS', done: true }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  }`}>
                    {item.done && <CheckCircle className="text-white" size={14} />}
                  </div>
                  <span className={item.done ? 'text-slate-500 line-through' : 'text-slate-700'}>
                    {item.task}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SEODashboard;
