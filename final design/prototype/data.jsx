// Shared mock data for NK Herbal CRM

const NK = {
  brand: 'NK Herbal',
  tagline: 'Sales operations',

  metrics: {
    totalOrders: 142,
    totalRevenue: 386100,         // ₹3.86L
    uniqueCustomers: 98,
    newCustomers: 27,
    repeatCustomers: 71,
    conversionRate: 18.4,         // %
    gstCollected: 19305,
    deliveredRate: 94.3,
    targetRevenue: 500000,
    targetProgress: 77,           // %
  },

  today: { orders: 6, revenue: 14200, newCustomers: 2 },

  channels: [
    { name: 'Website',  orders: 58, revenue: 168400, share: 0.44 },
    { name: 'WhatsApp', orders: 41, revenue: 102100, share: 0.26 },
    { name: 'Amazon',   orders: 27, revenue:  76200, share: 0.20 },
    { name: 'Offline',  orders: 16, revenue:  39400, share: 0.10 },
  ],

  trend: [
    { m: 'Nov', orders: 18, revenue: 48000 },
    { m: 'Dec', orders: 24, revenue: 62000 },
    { m: 'Jan', orders: 21, revenue: 57000 },
    { m: 'Feb', orders: 28, revenue: 71000 },
    { m: 'Mar', orders: 25, revenue: 64000 },
    { m: 'Apr', orders: 32, revenue: 84100 },
  ],

  topProducts: [
    { rank: 1, name: 'Mukoze For Men 300g',     orders: 28, revenue: 84000 },
    { rank: 2, name: 'Testo-Vardhak For Men 200g', orders: 21, revenue: 63000 },
    { rank: 3, name: 'Ashwagandha Premium 250g', orders: 19, revenue: 47500 },
    { rank: 4, name: 'Shilajit Resin 20g',       orders: 16, revenue: 38400 },
    { rank: 5, name: 'Triphala Churna 500g',     orders: 14, revenue: 21000 },
  ],

  recentOrders: [
    { id: 'NK-3421', date: 'Apr 27', name: 'Rajesh Kumar',   city: 'Mumbai',     product: 'Mukoze For Men 300g',    amt: 2999, channel: 'Website',  pay: 'Paid',    status: 'Delivered' },
    { id: 'NK-3420', date: 'Apr 27', name: 'Priya Sharma',   city: 'Delhi',      product: 'Ashwagandha Premium',    amt: 1499, channel: 'WhatsApp', pay: 'Paid',    status: 'Shipped' },
    { id: 'NK-3419', date: 'Apr 26', name: 'Amit Patel',     city: 'Ahmedabad',  product: 'Testo-Vardhak 200g',     amt: 2499, channel: 'Amazon',   pay: 'Paid',    status: 'Processing' },
    { id: 'NK-3418', date: 'Apr 26', name: 'Sneha Reddy',    city: 'Hyderabad',  product: 'Shilajit Resin 20g',     amt: 2199, channel: 'Website',  pay: 'COD',     status: 'Shipped' },
    { id: 'NK-3417', date: 'Apr 26', name: 'Vikram Singh',   city: 'Jaipur',     product: 'Mukoze For Men 300g',    amt: 2999, channel: 'WhatsApp', pay: 'Paid',    status: 'Delivered' },
    { id: 'NK-3416', date: 'Apr 25', name: 'Anjali Mehta',   city: 'Pune',       product: 'Triphala Churna 500g',   amt:  799, channel: 'Website',  pay: 'Paid',    status: 'Delivered' },
    { id: 'NK-3415', date: 'Apr 25', name: 'Karan Joshi',    city: 'Bengaluru',  product: 'Ashwagandha Premium',    amt: 1499, channel: 'Offline',  pay: 'Paid',    status: 'Delivered' },
    { id: 'NK-3414', date: 'Apr 25', name: 'Meera Iyer',     city: 'Chennai',    product: 'Testo-Vardhak 200g',     amt: 2499, channel: 'Amazon',   pay: 'Pending', status: 'Processing' },
  ],

  leads: [
    { name: 'Suresh Yadav',   src: 'WhatsApp', product: 'Mukoze For Men',    status: 'Follow Up',     when: '2h' },
    { name: 'Pooja Gupta',    src: 'Ads',      product: 'Ashwagandha',       status: 'Interested',    when: '4h' },
    { name: 'Rahul Verma',    src: 'Website',  product: 'Shilajit',          status: 'Interested',    when: '6h' },
    { name: 'Divya Nair',     src: 'Referral', product: 'Triphala',          status: 'Converted',     when: '1d' },
    { name: 'Arjun Kapoor',   src: 'WhatsApp', product: 'Testo-Vardhak',     status: 'Follow Up',     when: '1d' },
    { name: 'Neha Bansal',    src: 'Direct',   product: 'Mukoze For Men',    status: 'Not Interested',when: '2d' },
  ],

  followups: [
    { name: 'Rajesh Kumar', product: 'Mukoze For Men 300g',  day: 30, status: 'Pending' },
    { name: 'Priya Sharma', product: 'Ashwagandha Premium',  day: 60, status: 'Pending' },
    { name: 'Amit Patel',   product: 'Testo-Vardhak 200g',   day: 30, status: 'Sent' },
    { name: 'Sneha Reddy',  product: 'Shilajit Resin',       day: 90, status: 'Pending' },
  ],

  nav: [
    { id: 'dashboard',  label: 'Dashboard',  icon: 'grid' },
    { id: 'orders',     label: 'Orders',     icon: 'box',    badge: 12 },
    { id: 'leads',      label: 'Leads',      icon: 'target', badge: 6 },
    { id: 'customers',  label: 'Customers',  icon: 'users' },
    { id: 'followups',  label: 'Follow-ups', icon: 'bell',   badge: 4 },
    { id: 'whatsapp',   label: 'WhatsApp',   icon: 'message'},
    { id: 'reports',    label: 'Reports',    icon: 'chart'  },
    { id: 'settings',   label: 'Settings',   icon: 'gear'   },
  ],
};

// Indian rupee formatter
const inr = (n, opts = {}) => {
  const { compact = false, sign = true } = opts;
  if (compact) {
    if (n >= 10000000) return (sign ? '₹' : '') + (n / 10000000).toFixed(2) + 'Cr';
    if (n >= 100000)   return (sign ? '₹' : '') + (n / 100000).toFixed(2) + 'L';
    if (n >= 1000)     return (sign ? '₹' : '') + (n / 1000).toFixed(1) + 'K';
    return (sign ? '₹' : '') + n.toFixed(0);
  }
  return (sign ? '₹' : '') + n.toLocaleString('en-IN');
};

const num = (n) => n.toLocaleString('en-IN');

window.NK = NK;
window.inr = inr;
window.num = num;
