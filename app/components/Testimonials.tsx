import { Card } from "./ui/card";
import { Star } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Manager at TechCorp",
    image: "https://i.pravatar.cc/150?img=5",
    content: "FlowTask has completely transformed how our team collaborates. We've seen a 40% increase in productivity since switching.",
    rating: 5,
  },
  {
    name: "Michael Rodriguez",
    role: "CEO at StartupXYZ",
    image: "https://i.pravatar.cc/150?img=8",
    content: "The AI-powered features are game-changing. It feels like having a personal assistant that knows exactly what I need to do next.",
    rating: 5,
  },
  {
    name: "Emily Thompson",
    role: "Creative Director at DesignCo",
    image: "https://i.pravatar.cc/150?img=9",
    content: "Finally, a productivity tool that doesn't get in the way. It's intuitive, beautiful, and actually helps us get work done faster.",
    rating: 5,
  },
  {
    name: "David Park",
    role: "Engineering Lead at DevTeam",
    image: "https://i.pravatar.cc/150?img=12",
    content: "The integrations with our existing tools made the transition seamless. Our entire team was up and running in less than a day.",
    rating: 5,
  },
  {
    name: "Jessica Williams",
    role: "Operations Manager at GlobalCo",
    image: "https://i.pravatar.cc/150?img=20",
    content: "The analytics dashboard gives us incredible insights into our team's workflow. We can now identify bottlenecks before they become problems.",
    rating: 5,
  },
  {
    name: "Alex Turner",
    role: "Freelance Consultant",
    image: "https://i.pravatar.cc/150?img=15",
    content: "As a solo consultant, FlowTask helps me stay organized across multiple client projects. The free plan is perfect for my needs!",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-20 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl text-gray-900 mb-4">
            Loved by teams worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of satisfied customers who have transformed their productivity with FlowTask.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 border-gray-200 hover:shadow-lg transition-shadow duration-300">
              {/* Rating */}
              <div className="flex space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-600 mb-6">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center space-x-3">
                <ImageWithFallback
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="text-gray-900">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
          <div>
            <p className="text-4xl text-gray-900 mb-2">2,000+</p>
            <p className="text-gray-600">Active Teams</p>
          </div>
          <div>
            <p className="text-4xl text-gray-900 mb-2">50K+</p>
            <p className="text-gray-600">Users Worldwide</p>
          </div>
          <div>
            <p className="text-4xl text-gray-900 mb-2">99.9%</p>
            <p className="text-gray-600">Uptime</p>
          </div>
          <div>
            <p className="text-4xl text-gray-900 mb-2">4.9/5</p>
            <p className="text-gray-600">User Rating</p>
          </div>
        </div>
      </div>
    </section>
  );
}
