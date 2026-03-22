// -----------------------------------------------------------------------
// EDIT HERE: update Calendly links and Linktree URL
// -----------------------------------------------------------------------
const LINKTREE_URL = '#' // <-- replace with your Linktree URL

const services = [
  {
    id: 'cv-review',
    number: '01',
    title: 'CV Review',
    description:
      'Receive detailed, personalised feedback on your CV from our members with hands-on experience in finance, banking, and consulting. We help you craft a compelling, competitive curriculum that stands out to top recruiters.',
    price: '€ 19.90',
    calendlyUrl: '#', // <-- replace with your Calendly link
    features: [
      'Full structure and layout review',
      'Content and language feedback',
      'Tailored suggestions for finance roles',
      'Response within 48 hours',
    ],
  },
  {
    id: 'master',
    number: '02',
    title: 'Master Orientation Call',
    description:
      "Get guidance from those who have already navigated the graduate school path in finance. We help you identify the most suitable master's programme for your profile and professional goals, in Italy and abroad.",
    price: '€ 29.90',
    calendlyUrl: '#', // <-- replace with your Calendly link
    features: [
      '45-minute 1:1 session',
      'Personal profile analysis',
      'Programme comparison and ranking',
      'Application and admission advice',
    ],
  },
  {
    id: 'career',
    number: '03',
    title: 'Career Orientation Call',
    description:
      'A personalised consulting session to define your professional roadmap in the financial sector. From choosing your first internship to building your network, we help you take the right steps at the right time.',
    price: '€ 29.90',
    calendlyUrl: '#', // <-- replace with your Calendly link
    features: [
      '45-minute 1:1 session',
      'Professional goals definition',
      'Networking strategy',
      'Personal development plan',
    ],
  },
]
// -----------------------------------------------------------------------

export default function CareerServicePage() {
  return (
    <div>
      {/* Header — dark */}
      <section className="bg-[#1B3A4B] text-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Professional support</p>
          <h1 className="font-serif text-5xl sm:text-6xl font-light text-white mb-6">
            Career Service
          </h1>
          <div className="w-12 h-px bg-white/30 mb-6" />
          <p className="text-white/70 text-base max-w-2xl leading-relaxed">
            Services designed to accelerate your career in finance — from university orientation to landing your first role in the industry.
          </p>
        </div>
      </section>

      {/* Services — light */}
      <section className="py-20 sm:py-28 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-px bg-[#e5e5e5] md:grid-cols-3">
            {services.map((service) => (
              <div key={service.id} className="bg-white p-8 sm:p-10 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <span className="font-serif text-5xl font-light text-[#e5e5e5]">
                    {service.number}
                  </span>
                  <span className="font-serif text-2xl font-medium text-[#1B3A4B]">
                    {service.price}
                  </span>
                </div>

                <div>
                  <h2 className="font-serif text-2xl font-medium text-[#0a0a0a] mb-3">
                    {service.title}
                  </h2>
                  <p className="text-[#6b7280] text-sm leading-relaxed">{service.description}</p>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-[#0a0a0a]">
                      <span className="w-1 h-1 rounded-full bg-[#1B3A4B] flex-shrink-0 mt-2" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href={service.calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full bg-[#1B3A4B] hover:bg-[#142e3c] text-white text-sm font-medium tracking-wide py-3.5 px-6 transition-colors duration-150 mt-2"
                >
                  Book now
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Linktree — white */}
      <section className="py-20 bg-white border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-4">Follow us</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#0a0a0a] mb-4">
            All our links in one place
          </h2>
          <p className="text-[#6b7280] text-sm leading-relaxed mb-10">
            Follow Alata Investment Club on social media, access our resources, and stay updated on our activities.
          </p>
          <a
            href={LINKTREE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#1B3A4B] hover:bg-[#142e3c] text-white text-sm font-medium tracking-wide px-10 py-4 transition-colors duration-150"
          >
            Visit our Linktree
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  )
}
