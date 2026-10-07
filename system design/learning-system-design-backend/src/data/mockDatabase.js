// Mock database service - simulates Prisma
// Replace this with real Prisma when ready to use PostgreSQL

const mockData = require('./mockData');
const bcrypt = require('bcryptjs');

// Helper to generate unique IDs
const generateId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Hash passwords synchronously so the first login request cannot race startup.
// These credentials are intentionally kept in one place for the demo seed data.
const initializePasswords = () => {
  const passwordsByEmail = {
    'admin@amituniform.com': 'admin123',
    'ravi@amituniform.com': 'sales123',
    'anjali@amituniform.com': 'sales123',
    'kiran@amituniform.com': 'production123',
    'meera@amituniform.com': 'accountant123',
    'prakash@amituniform.com': 'purchase123',
    'neha@amituniform.com': 'marketing123',
  };

  mockData.users.forEach((user) => {
    const password = passwordsByEmail[user.email];
    if (password) user.password = bcrypt.hashSync(password, 10);
  });
};

// Initialize on first load
initializePasswords();

// Mock Prisma client
const mockPrisma = {
  // User operations
  user: {
    findUnique: async ({ where, select }) => {
      let user = mockData.users.find(u => {
        if (where.id) return u.id === where.id;
        if (where.email) return u.email === where.email;
        return false;
      });

      if (!user) return null;

      // Apply select if provided
      if (select) {
        const selectedUser = {};
        Object.keys(select).forEach(key => {
          if (select[key]) selectedUser[key] = user[key];
        });
        return selectedUser;
      }

      return user;
    },

    create: async ({ data, select }) => {
      const newUser = {
        id: generateId('user'),
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      };
      mockData.users.push(newUser);

      if (select) {
        const selectedUser = {};
        Object.keys(select).forEach(key => {
          if (select[key]) selectedUser[key] = newUser[key];
        });
        return selectedUser;
      }

      return newUser;
    },

    update: async ({ where, data, select }) => {
      const index = mockData.users.findIndex(u => u.id === where.id);
      if (index === -1) throw new Error('User not found');

      mockData.users[index] = {
        ...mockData.users[index],
        ...data,
        updatedAt: new Date(),
      };

      const updatedUser = mockData.users[index];

      if (select) {
        const selectedUser = {};
        Object.keys(select).forEach(key => {
          if (select[key]) selectedUser[key] = updatedUser[key];
        });
        return selectedUser;
      }

      return updatedUser;
    },

    findMany: async ({ where = {}, select, orderBy, skip = 0, take = 1000 }) => {
      let users = [...mockData.users];

      // Apply filters
      if (where.role) users = users.filter(u => u.role === where.role);
      if (where.isActive !== undefined) users = users.filter(u => u.isActive === where.isActive);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        users.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      // Apply pagination
      users = users.slice(skip, skip + take);

      // Apply select
      if (select) {
        return users.map(user => {
          const selectedUser = {};
          Object.keys(select).forEach(key => {
            if (select[key]) selectedUser[key] = user[key];
          });
          return selectedUser;
        });
      }

      return users;
    },

    delete: async ({ where }) => {
      const index = mockData.users.findIndex(u => u.id === where.id);
      if (index === -1) throw new Error('User not found');

      const deletedUser = mockData.users[index];
      mockData.users.splice(index, 1);
      return deletedUser;
    },
  },

  // Lead operations
  lead: {
    findMany: async ({ where = {}, include, orderBy, skip = 0, take = 1000 }) => {
      let leads = [...mockData.leads];

      // Apply filters
      if (where.status) leads = leads.filter(l => Array.isArray(where.status.in) ? where.status.in.includes(l.status) : l.status === where.status);
      if (where.priority) leads = leads.filter(l => l.priority === where.priority);
      if (where.source) leads = leads.filter(l => l.source === where.source);
      if (where.salesPersonId) leads = leads.filter(l => l.salesPersonId === where.salesPersonId);
      if (where.campaignId) {
        if (typeof where.campaignId === 'object' && where.campaignId.not !== undefined) {
          leads = leads.filter(l => l.campaignId !== where.campaignId.not);
        } else {
          leads = leads.filter(l => l.campaignId === where.campaignId);
        }
      }

      // Apply OR search
      if (where.OR) {
        leads = leads.filter(lead => {
          return where.OR.some(condition => {
            if (condition.companyName) {
              return lead.companyName.toLowerCase().includes(condition.companyName.contains.toLowerCase());
            }
            if (condition.contactPerson) {
              return lead.contactPerson.toLowerCase().includes(condition.contactPerson.contains.toLowerCase());
            }
            if (condition.mobile) {
              return lead.mobile.includes(condition.mobile.contains);
            }
            if (condition.email) {
              return lead.email?.toLowerCase().includes(condition.email.contains.toLowerCase());
            }
            return false;
          });
        });
      }

      // Apply ordering
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const order = orderBy[key];
        leads.sort((a, b) => {
          if (order === 'desc') {
            return b[key] > a[key] ? 1 : -1;
          }
          return a[key] > b[key] ? 1 : -1;
        });
      }

      // Apply pagination
      leads = leads.slice(skip, skip + take);

      // Include relations
      if (include?.salesPerson) {
        leads = leads.map(lead => ({
          ...lead,
          salesPerson: mockData.users.find(u => u.id === lead.salesPersonId),
        }));
      }

      return leads;
    },

    findUnique: async ({ where, include }) => {
      const lead = mockData.leads.find(l => l.id === where.id);
      if (!lead) return null;

      let result = { ...lead };

      if (include?.salesPerson) {
        result.salesPerson = mockData.users.find(u => u.id === lead.salesPersonId);
      }

      if (include?.activities) {
        result.activities = mockData.activities
          .filter(a => a.leadId === lead.id)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 20);
      }

      if (include?.quotations) {
        result.quotations = [];
      }

      return result;
    },

    create: async ({ data, include }) => {
      const newLead = {
        id: generateId('lead'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        convertedAt: null,
      };
      mockData.leads.push(newLead);

      let result = { ...newLead };

      if (include?.salesPerson) {
        result.salesPerson = mockData.users.find(u => u.id === newLead.salesPersonId);
      }

      return result;
    },

    update: async ({ where, data, include }) => {
      const index = mockData.leads.findIndex(l => l.id === where.id);
      if (index === -1) throw new Error('Lead not found');

      mockData.leads[index] = {
        ...mockData.leads[index],
        ...data,
        updatedAt: new Date(),
      };

      let result = { ...mockData.leads[index] };

      if (include?.salesPerson) {
        result.salesPerson = mockData.users.find(u => u.id === result.salesPersonId);
      }

      return result;
    },

    delete: async ({ where }) => {
      const index = mockData.leads.findIndex(l => l.id === where.id);
      if (index === -1) throw new Error('Lead not found');

      const deleted = mockData.leads.splice(index, 1)[0];
      return deleted;
    },

    count: async ({ where = {} }) => {
      // Use the same stage, search and ownership filters as the paginated list.
      const leads = await mockPrisma.lead.findMany({ where, take: Number.MAX_SAFE_INTEGER });
      return leads.length;
    },

    groupBy: async ({ by, where = {}, _count }) => {
      let leads = [...mockData.leads];

      if (where.salesPersonId) {
        leads = leads.filter(l => l.salesPersonId === where.salesPersonId);
      }

      const groups = {};
      leads.forEach(lead => {
        const key = lead[by[0]];
        if (!groups[key]) {
          groups[key] = { [by[0]]: key, _count: 0 };
        }
        groups[key]._count++;
      });

      return Object.values(groups);
    },
  },

  // Activity operations
  activity: {
    create: async ({ data }) => {
      const newActivity = {
        id: generateId('activity'),
        ...data,
        createdAt: new Date(),
      };
      mockData.activities.push(newActivity);
      return newActivity;
    },
  },

  // Product operations
  product: {
    findMany: async ({ where = {}, orderBy, skip = 0, take = 1000 }) => {
      let products = [...mockData.products];

      // Apply filters
      if (where.category) products = products.filter(p => p.category === where.category);
      if (where.isActive !== undefined) products = products.filter(p => p.isActive === where.isActive);

      // Apply OR search
      if (where.OR) {
        products = products.filter(product => {
          return where.OR.some(condition => {
            if (condition.name) {
              return product.name.toLowerCase().includes(condition.name.contains.toLowerCase());
            }
            if (condition.sku) {
              return product.sku.toLowerCase().includes(condition.sku.contains.toLowerCase());
            }
            if (condition.description) {
              return product.description?.toLowerCase().includes(condition.description.contains.toLowerCase());
            }
            return false;
          });
        });
      }

      // Apply ordering
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const order = orderBy[key];
        products.sort((a, b) => {
          if (order === 'desc') {
            return b[key] > a[key] ? 1 : -1;
          }
          return a[key] > b[key] ? 1 : -1;
        });
      }

      // Apply pagination
      products = products.slice(skip, skip + take);

      return products;
    },

    findUnique: async ({ where }) => {
      if (where.id) {
        return mockData.products.find(p => p.id === where.id) || null;
      }
      if (where.sku) {
        return mockData.products.find(p => p.sku === where.sku) || null;
      }
      return null;
    },

    create: async ({ data }) => {
      const newProduct = {
        id: generateId('prod'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.products.push(newProduct);
      return newProduct;
    },

    update: async ({ where, data }) => {
      const index = mockData.products.findIndex(p => p.id === where.id);
      if (index === -1) throw new Error('Product not found');

      mockData.products[index] = {
        ...mockData.products[index],
        ...data,
        updatedAt: new Date(),
      };

      return mockData.products[index];
    },

    delete: async ({ where }) => {
      const index = mockData.products.findIndex(p => p.id === where.id);
      if (index === -1) throw new Error('Product not found');

      const deleted = mockData.products.splice(index, 1)[0];
      return deleted;
    },

    count: async ({ where = {} }) => {
      let products = [...mockData.products];

      if (where.category) products = products.filter(p => p.category === where.category);
      if (where.isActive !== undefined) products = products.filter(p => p.isActive === where.isActive);

      return products.length;
    },

    groupBy: async ({ by, _count }) => {
      const groups = {};
      mockData.products.forEach(product => {
        const key = product[by[0]];
        if (!groups[key]) {
          groups[key] = { [by[0]]: key, _count: 0 };
        }
        groups[key]._count++;
      });

      return Object.values(groups);
    },
  },

  // Customer operations (basic - for quotations)
  customer: {
    findMany: async () => {
      // Convert leads with status COMPLETED to customers for demo
      return mockData.customers;
    },

    findUnique: async ({ where }) => {
      // Check customers first, then fallback to leads (for quotations that reference leads)
      return mockData.customers.find(c => c.id === where.id) ||
             mockData.leads.find(l => l.id === where.id) ||
             null;
    },

    update: async ({where,data}) => {
      const current=mockData.customers.find(c=>c.id===where.id);
      if(!current)throw new Error('Customer not found');
      if(data.leadId && mockData.customers.some(c=>c.id!==where.id&&c.leadId===data.leadId))throw Object.assign(new Error('Lead already linked'),{code:'P2002'});
      Object.assign(current,data,{updatedAt:new Date()});return {...current};
    },
    create: async ({ data }) => {
      if (data.leadId && mockData.customers.some(row=>row.leadId === data.leadId)) throw Object.assign(new Error('This source already has a linked customer'),{code:'P2002'});
      const newCustomer = {
        id: generateId('cust'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.customers.push(newCustomer);
      return newCustomer;
    },
  },

  // Quotation operations
  quotation: {
    findMany: async ({ where = {}, include, orderBy, skip = 0, take = 1000 }) => {
      let quotations = [...mockData.quotations];

      if (where.status) quotations = quotations.filter(q => q.status === where.status);
      if (where.customerId) quotations = quotations.filter(q => q.customerId === where.customerId);
      if (where.salesPersonId) quotations = quotations.filter(q => q.salesPersonId === where.salesPersonId);

      if (where.OR) {
        quotations = quotations.filter(q => {
          return where.OR.some(condition => {
            if (condition.quotationNumber) {
              return q.quotationNumber.toLowerCase().includes(condition.quotationNumber.contains.toLowerCase());
            }
            return false;
          });
        });
      }

      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const order = orderBy[key];
        quotations.sort((a, b) => {
          if (order === 'desc') return b[key] > a[key] ? 1 : -1;
          return a[key] > b[key] ? 1 : -1;
        });
      }

      quotations = quotations.slice(skip, skip + take);

      if (include) {
        quotations = quotations.map(q => {
          const result = { ...q };
          if (include.customer) {
            result.customer = mockData.customers.find(c => c.id === q.customerId) ||
                             mockData.leads.find(l => l.id === q.customerId);
          }
          if (include.salesPerson) {
            result.salesPerson = mockData.users.find(u => u.id === q.salesPersonId);
          }
          if (include.items) {
            result.items = mockData.quotationItems.filter(qi => qi.quotationId === q.id).map(qi => {
              const item = { ...qi };
              if (include.items.include?.product) {
                item.product = mockData.products.find(p => p.id === qi.productId) || (qi.description ? {name:qi.description, id:null} : null);
              }
              return item;
            });
          }
          return result;
        });
      }

      return quotations;
    },

    findUnique: async ({ where, include }) => {
      const quotation = mockData.quotations.find(q => q.id === where.id);
      if (!quotation) return null;

      const result = { ...quotation };

      if (include) {
        if (include.customer) {
          result.customer = mockData.customers.find(c => c.id === quotation.customerId) ||
                           mockData.leads.find(l => l.id === quotation.customerId);
        }
        if (include.salesPerson) {
          result.salesPerson = mockData.users.find(u => u.id === quotation.salesPersonId);
        }
        if (include.items) {
          result.items = mockData.quotationItems.filter(qi => qi.quotationId === quotation.id).map(qi => {
            const item = { ...qi };
            if (include.items.include?.product) {
              item.product = mockData.products.find(p => p.id === qi.productId) || (qi.description ? {name:qi.description, id:null} : null);
            }
            return item;
          });
        }
      }

      return result;
    },

    create: async ({ data, include }) => {
      const newQuotation = {
        id: generateId('quot'),
        ...data,
        items: undefined, // Remove items from main object
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
      };

      // Handle items separately
      if (data.items?.create) {
        data.items.create.forEach(itemData => {
          const newItem = {
            id: generateId('qitem'),
            quotationId: newQuotation.id,
            ...itemData,
          };
          mockData.quotationItems.push(newItem);
        });
      }

      mockData.quotations.push(newQuotation);

      // Return with includes
      return await mockPrisma.quotation.findUnique({ where: { id: newQuotation.id }, include });
    },

    update: async ({ where, data, include }) => {
      const index = mockData.quotations.findIndex(q => q.id === where.id);
      if (index === -1) throw new Error('Quotation not found');

      if(data.items?.deleteMany)mockData.quotationItems=mockData.quotationItems.filter(i=>i.quotationId!==where.id);
      if(data.items?.create)for(const item of data.items.create)mockData.quotationItems.push({id:generateId('qitem'),quotationId:where.id,...item});
      data={...data};delete data.items;
      mockData.quotations[index] = {
        ...mockData.quotations[index],
        ...data,
        updatedAt: new Date(),
      };

      return await mockPrisma.quotation.findUnique({ where: { id: where.id }, include });
    },

    delete: async ({ where }) => {
      const index = mockData.quotations.findIndex(q => q.id === where.id);
      if (index === -1) throw new Error('Quotation not found');

      // Delete items
      mockData.quotationItems = mockData.quotationItems.filter(qi => qi.quotationId !== where.id);

      const deleted = mockData.quotations.splice(index, 1)[0];
      return deleted;
    },

    count: async ({ where = {} }) => {
      let quotations = [...mockData.quotations];

      if (where.status) quotations = quotations.filter(q => q.status === where.status);
      if (where.salesPersonId) quotations = quotations.filter(q => q.salesPersonId === where.salesPersonId);

      return quotations.length;
    },

    groupBy: async ({ by, where = {}, _count }) => {
      let quotations = [...mockData.quotations];

      if (where.salesPersonId) {
        quotations = quotations.filter(q => q.salesPersonId === where.salesPersonId);
      }

      const groups = {};
      quotations.forEach(q => {
        const key = q[by[0]];
        if (!groups[key]) {
          groups[key] = { [by[0]]: key, _count: 0 };
        }
        groups[key]._count++;
      });

      return Object.values(groups);
    },
  },

  // QuotationItem operations
  quotationItem: {
    deleteMany: async ({ where }) => {
      const initialLength = mockData.quotationItems.length;

      if (where.quotationId) {
        mockData.quotationItems = mockData.quotationItems.filter(qi => qi.quotationId !== where.quotationId);
      }

      return { count: initialLength - mockData.quotationItems.length };
    },
  },

  // Order operations
  order: {
    findMany: async ({ where = {}, include, orderBy, skip = 0, take = 1000 }) => {
      let orders = [...mockData.orders];

      if (where.status) orders = orders.filter(o => o.status === where.status);
      if (where.customerId) orders = orders.filter(o => o.customerId === where.customerId);
      if (where.salesPersonId) orders = orders.filter(o => o.salesPersonId === where.salesPersonId);

      if (where.OR) {
        orders = orders.filter(o => {
          return where.OR.some(condition => {
            if (condition.orderNumber) {
              return o.orderNumber.toLowerCase().includes(condition.orderNumber.contains.toLowerCase());
            }
            if (condition.poNumber) {
              return o.poNumber?.toLowerCase().includes(condition.poNumber.contains.toLowerCase());
            }
            return false;
          });
        });
      }

      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const order = orderBy[key];
        orders.sort((a, b) => {
          if (order === 'desc') return b[key] > a[key] ? 1 : -1;
          return a[key] > b[key] ? 1 : -1;
        });
      }

      orders = orders.slice(skip, skip + take);

      if (include) {
        orders = orders.map(o => {
          const result = { ...o };
          if (include.customer) {
            result.customer = mockData.customers.find(c => c.id === o.customerId) ||
                             mockData.leads.find(l => l.id === o.customerId);
          }
          if (include.salesPerson) {
            result.salesPerson = mockData.users.find(u => u.id === o.salesPersonId);
          }
          if (include.quotation) {
            result.quotation = mockData.quotations.find(q => q.id === o.quotationId);
          }
          if (include.items) {
            result.items = mockData.orderItems.filter(oi => oi.orderId === o.id).map(oi => {
              const item = { ...oi };
              if (include.items.include?.product) {
                item.product = mockData.products.find(p => p.id === oi.productId) || (oi.description ? {name:oi.description, id:null} : null);
              }
              if (include.items.include?.productionTracking) {
                item.productionTracking = mockData.productionTracking.find(pt => pt.orderItemId === oi.id);
              }
              return item;
            });
          }
          return result;
        });
      }

      return orders;
    },

    findUnique: async ({ where, include }) => {
      const order = mockData.orders.find(o => o.id === where.id);
      if (!order) return null;

      const result = { ...order };

      if (include) {
        if (include.customer) {
          result.customer = mockData.customers.find(c => c.id === order.customerId) ||
                           mockData.leads.find(l => l.id === order.customerId);
        }
        if (include.salesPerson) {
          result.salesPerson = mockData.users.find(u => u.id === order.salesPersonId);
        }
        if (include.quotation) {
          result.quotation = mockData.quotations.find(q => q.id === order.quotationId);
        }
        if (include.items) {
          result.items = mockData.orderItems.filter(oi => oi.orderId === order.id).map(oi => {
            const item = { ...oi };
            if (include.items.include?.product) {
              item.product = mockData.products.find(p => p.id === oi.productId) || (oi.description ? {name:oi.description, id:null} : null);
            }
            if (include.items.include?.productionTracking) {
              item.productionTracking = mockData.productionTracking.find(pt => pt.orderItemId === oi.id);
            }
            return item;
          });
        }
      }

      return result;
    },

    findFirst: async ({ where, include }) => {
      const order = mockData.orders.find(o => {
        if (where.quotationId) return o.quotationId === where.quotationId;
        return true;
      });

      if (!order) return null;

      return await mockPrisma.order.findUnique({ where: { id: order.id }, include });
    },

    create: async ({ data, include }) => {
      if (data.quotationId && mockData.orders.some(row=>row.quotationId === data.quotationId)) throw Object.assign(new Error('This source already has a linked order'),{code:'P2002'});
      const newOrder = {
        id: generateId('order'),
        ...data,
        items: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: null,
        completedAt: null,
      };

      if (data.items?.create) {
        data.items.create.forEach(itemData => {
          const newItem = {
            id: generateId('oitem'),
            orderId: newOrder.id,
            ...itemData,
          };
          mockData.orderItems.push(newItem);
        });
      }

      mockData.orders.push(newOrder);

      return await mockPrisma.order.findUnique({ where: { id: newOrder.id }, include });
    },

    update: async ({ where, data, include }) => {
      const index = mockData.orders.findIndex(o => o.id === where.id);
      if (index === -1) throw new Error('Order not found');

      if(data.items?.deleteMany) mockData.orderItems=mockData.orderItems.filter(i=>i.orderId!==where.id);
      if(data.items?.create)for(const item of data.items.create)mockData.orderItems.push({id:generateId('oitem'),orderId:where.id,...item});
      data={...data}; delete data.items;
      mockData.orders[index] = {
        ...mockData.orders[index],
        ...data,
        updatedAt: new Date(),
      };

      return await mockPrisma.order.findUnique({ where: { id: where.id }, include });
    },

    delete: async ({ where }) => {
      const index = mockData.orders.findIndex(o => o.id === where.id);
      if (index === -1) throw new Error('Order not found');

      mockData.orderItems = mockData.orderItems.filter(oi => oi.orderId !== where.id);

      const deleted = mockData.orders.splice(index, 1)[0];
      return deleted;
    },

    count: async ({ where = {} }) => {
      let orders = [...mockData.orders];

      if (where.status) orders = orders.filter(o => o.status === where.status);
      if (where.salesPersonId) orders = orders.filter(o => o.salesPersonId === where.salesPersonId);

      return orders.length;
    },

    groupBy: async ({ by, where = {}, _count }) => {
      let orders = [...mockData.orders];

      if (where.salesPersonId) {
        orders = orders.filter(o => o.salesPersonId === where.salesPersonId);
      }

      const groups = {};
      orders.forEach(o => {
        const key = o[by[0]];
        if (!groups[key]) {
          groups[key] = { [by[0]]: key, _count: 0 };
        }
        groups[key]._count++;
      });

      return Object.values(groups);
    },
  },

  // OrderItem operations
  orderItem: {
    findMany: async ({ where = {}, include }) => {
      let orderItems = [...mockData.orderItems];

      if (where.orderId) orderItems = orderItems.filter(oi => oi.orderId === where.orderId);

      if (include) {
        orderItems = orderItems.map(oi => {
          const result = { ...oi };

          if (include.product) {
            result.product = mockData.products.find(p => p.id === oi.productId) || (oi.description ? {name:oi.description, id:null} : null);
          }

          if (include.order) {
            result.order = mockData.orders.find(o => o.id === oi.orderId);
          }

          if (include.productionTracking) {
            result.productionTracking = mockData.productionTracking.find(pt => pt.orderItemId === oi.id);
          }

          return result;
        });
      }

      return orderItems;
    },

    findUnique: async ({ where, include }) => {
      const orderItem = mockData.orderItems.find(oi => oi.id === where.id);
      if (!orderItem) return null;

      const result = { ...orderItem };

      if (include) {
        if (include.product) {
          result.product = mockData.products.find(p => p.id === orderItem.productId) || (orderItem.description ? {name:orderItem.description, id:null} : null);
        }

        if (include.order) {
          result.order = mockData.orders.find(o => o.id === orderItem.orderId);
        }

        if (include.productionTracking) {
          result.productionTracking = mockData.productionTracking.find(pt => pt.orderItemId === orderItem.id);
        }
      }

      return result;
    },

    deleteMany: async ({ where }) => {
      const initialLength = mockData.orderItems.length;

      if (where.orderId) {
        mockData.orderItems = mockData.orderItems.filter(oi => oi.orderId !== where.orderId);
      }

      return { count: initialLength - mockData.orderItems.length };
    },
  },

  // Invoice operations
  invoice: {
    findMany: async ({ where = {}, include, orderBy, skip = 0, take = 1000 }) => {
      let invoices = [...mockData.invoices];

      if (where.status) invoices = invoices.filter(i => i.status === where.status);
      if (where.customerId) invoices = invoices.filter(i => i.customerId === where.customerId);
      if (where.salesPersonId) invoices = invoices.filter(i => i.salesPersonId === where.salesPersonId);
      if (where.orderId) invoices = invoices.filter(i => i.orderId === where.orderId);

      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const order = orderBy[key];
        invoices.sort((a, b) => {
          if (order === 'desc') return b[key] > a[key] ? 1 : -1;
          return a[key] > b[key] ? 1 : -1;
        });
      }

      invoices = invoices.slice(skip, skip + take);

      if (include) {
        invoices = invoices.map(invoice => {
          const result = { ...invoice };

          if (include.customer) {
            result.customer = mockData.customers.find(c => c.id === invoice.customerId) ||
                              mockData.leads.find(l => l.id === invoice.customerId);
          }

          if (include.order) {
            const order = mockData.orders.find(o => o.id === invoice.orderId);
            if (order) {
              result.order = include.order.select
                ? Object.keys(include.order.select).reduce((obj, key) => {
                    obj[key] = order[key];
                    return obj;
                  }, {})
                : order;
            }
          }

          if (include.items) {
            result.items = mockData.invoiceItems
              .filter(item => item.invoiceId === invoice.id)
              .map(item => {
                if (include.items.include?.product) {
                  return {
                    ...item,
                    product: mockData.products.find(p => p.id === item.productId) || (item.description ? {name:item.description, id:null} : null),
                  };
                }
                return item;
              });
          }

          return result;
        });
      }

      return invoices;
    },

    findUnique: async ({ where, include }) => {
      const invoice = mockData.invoices.find(i => i.id === where.id);
      if (!invoice) return null;

      const result = { ...invoice };

      if (include) {
        if (include.customer) {
          result.customer = mockData.customers.find(c => c.id === invoice.customerId) ||
                            mockData.leads.find(l => l.id === invoice.customerId);
        }

        if (include.order) {
          const order = mockData.orders.find(o => o.id === invoice.orderId);
          if (order) {
            result.order = include.order.select
              ? Object.keys(include.order.select).reduce((obj, key) => {
                  obj[key] = order[key];
                  return obj;
                }, {})
              : order;
          }
        }

        if (include.items) {
          result.items = mockData.invoiceItems
            .filter(item => item.invoiceId === invoice.id)
            .map(item => {
              if (include.items.include?.product) {
                return {
                  ...item,
                  product: mockData.products.find(p => p.id === item.productId) || (item.description ? {name:item.description, id:null} : null),
                };
              }
              return item;
            });
        }
      }

      return result;
    },

    findFirst: async ({ where, include }) => {
      let invoice;

      if (where.orderId) {
        invoice = mockData.invoices.find(i => i.orderId === where.orderId);
      }

      if (!invoice) return null;

      return await mockPrisma.invoice.findUnique({ where: { id: invoice.id }, include });
    },

    create: async ({ data, include }) => {
      if (mockData.invoices.some(i => i.orderId === data.orderId)) throw Object.assign(new Error('Invoice already exists'), {code:'P2002',status:409});
      const newInvoice = {
        id: generateId('inv'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (data.items?.create) {
        data.items.create.forEach(itemData => {
          const newItem = {
            id: generateId('invitem'),
            invoiceId: newInvoice.id,
            ...itemData,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockData.invoiceItems.push(newItem);
        });
      }

      mockData.invoices.push(newInvoice);

      return await mockPrisma.invoice.findUnique({ where: { id: newInvoice.id }, include });
    },

    update: async ({ where, data, include }) => {
      const index = mockData.invoices.findIndex(i => i.id === where.id);
      if (index === -1) throw new Error('Invoice not found');

      if (data.items?.deleteMany) mockData.invoiceItems = mockData.invoiceItems.filter(item => item.invoiceId !== where.id);
      if (data.items?.create) for (const item of data.items.create) mockData.invoiceItems.push({id:generateId('invitem'),invoiceId:where.id,...item});
      mockData.invoices[index] = {
        ...mockData.invoices[index],
        ...data,
        updatedAt: new Date(),
      };

      return await mockPrisma.invoice.findUnique({ where: { id: where.id }, include });
    },

    delete: async ({ where }) => {
      const index = mockData.invoices.findIndex(i => i.id === where.id);
      if (index === -1) throw new Error('Invoice not found');

      mockData.invoiceItems = mockData.invoiceItems.filter(ii => ii.invoiceId !== where.id);

      const deleted = mockData.invoices.splice(index, 1)[0];
      return deleted;
    },

    count: async ({ where = {} }) => {
      let invoices = [...mockData.invoices];

      if (where.status) invoices = invoices.filter(i => i.status === where.status);
      if (where.salesPersonId) invoices = invoices.filter(i => i.salesPersonId === where.salesPersonId);

      return invoices.length;
    },
  },

  // InvoiceItem operations
  invoiceItem: {
    deleteMany: async ({ where }) => {
      const initialLength = mockData.invoiceItems.length;

      if (where.invoiceId) {
        mockData.invoiceItems = mockData.invoiceItems.filter(ii => ii.invoiceId !== where.invoiceId);
      }

      return { count: initialLength - mockData.invoiceItems.length };
    },
  },

  // ProductionTracking operations
  productionTracking: {
    findMany: async ({ where = {}, include, orderBy }) => {
      let tracking = [...mockData.productionTracking];

      if (where.stage) tracking = tracking.filter(t => t.stage === where.stage);
      if (where.orderItemId) tracking = tracking.filter(t => t.orderItemId === where.orderItemId);
      if (where.assignedWorkerId) tracking = tracking.filter(t => t.assignedWorkerId === where.assignedWorkerId);

      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const order = orderBy[key];
        tracking.sort((a, b) => {
          if (order === 'desc') return b[key] > a[key] ? 1 : -1;
          return a[key] > b[key] ? 1 : -1;
        });
      }

      if (include) {
        tracking = tracking.map(t => {
          const result = { ...t };

          if (include.orderItem) {
            const orderItem = mockData.orderItems.find(oi => oi.id === t.orderItemId);
            if (orderItem) {
              result.orderItem = { ...orderItem };

              if (include.orderItem.include) {
                if (include.orderItem.include.product) {
                  result.orderItem.product = mockData.products.find(p => p.id === orderItem.productId) || (orderItem.description ? {name:orderItem.description, id:null} : null);
                }
                if (include.orderItem.include.order) {
                  const order = mockData.orders.find(o => o.id === orderItem.orderId);
                  if (order && include.orderItem.include.order.include?.customer) {
                    result.orderItem.order = {
                      ...order,
                      customer: mockData.customers.find(c => c.id === order.customerId) ||
                                mockData.leads.find(l => l.id === order.customerId),
                    };
                  } else if (order) {
                    result.orderItem.order = order;
                  }
                }
              }
            }
          }

          if (include.assignedWorker) {
            const worker = mockData.users.find(u => u.id === t.assignedWorkerId);
            if (worker) {
              result.assignedWorker = include.assignedWorker.select
                ? Object.keys(include.assignedWorker.select).reduce((obj, key) => {
                    obj[key] = worker[key];
                    return obj;
                  }, {})
                : worker;
            }
          }

          return result;
        });
      }

      return tracking;
    },

    findUnique: async ({ where, include }) => {
      const tracking = mockData.productionTracking.find(t => t.id === where.id);
      if (!tracking) return null;

      return await mockPrisma.productionTracking.findMany({
        where: { id: where.id },
        include
      }).then(results => results[0] || null);
    },

    findFirst: async ({ where, include }) => {
      let tracking;

      if (where.orderItemId) {
        tracking = mockData.productionTracking.find(t => t.orderItemId === where.orderItemId);
      }

      if (!tracking) return null;

      return await mockPrisma.productionTracking.findUnique({ where: { id: tracking.id }, include });
    },

    create: async ({ data, include }) => {
      const newTracking = {
        id: generateId('prodtrack'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockData.productionTracking.push(newTracking);

      return await mockPrisma.productionTracking.findUnique({ where: { id: newTracking.id }, include });
    },

    update: async ({ where, data, include }) => {
      const index = mockData.productionTracking.findIndex(t => t.id === where.id);
      if (index === -1) throw new Error('Production tracking not found');

      mockData.productionTracking[index] = {
        ...mockData.productionTracking[index],
        ...data,
        updatedAt: new Date(),
      };

      return await mockPrisma.productionTracking.findUnique({ where: { id: where.id }, include });
    },

    delete: async ({ where }) => {
      const index = mockData.productionTracking.findIndex(t => t.id === where.id);
      if (index === -1) throw new Error('Production tracking not found');

      const deleted = mockData.productionTracking.splice(index, 1)[0];
      return deleted;
    },
  },

  // Payment operations
  payment: {
    findMany: async ({ where = {}, include, orderBy }) => {
      let payments = [...mockData.payments];

      if (where.invoiceId) payments = payments.filter(p => p.invoiceId === where.invoiceId);
      if (where.customerId) payments = payments.filter(p => p.customerId === where.customerId);
      if (where.method) payments = payments.filter(p => p.method === where.method);
      if (where.receivedBy) payments = payments.filter(p => p.receivedBy === where.receivedBy);

      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const order = orderBy[key];
        payments.sort((a, b) => {
          if (order === 'desc') return b[key] > a[key] ? 1 : -1;
          return a[key] > b[key] ? 1 : -1;
        });
      }

      if (include) {
        payments = payments.map(p => {
          const result = { ...p };

          if (include.invoice) {
            const invoice = mockData.invoices.find(i => i.id === p.invoiceId);
            if (invoice) {
              result.invoice = include.invoice.select
                ? Object.keys(include.invoice.select).reduce((obj, key) => {
                    obj[key] = invoice[key];
                    return obj;
                  }, {})
                : invoice;
            }
          }

          if (include.customer) {
            result.customer = mockData.customers.find(c => c.id === p.customerId) ||
                              mockData.leads.find(l => l.id === p.customerId);
          }

          if (include.receivedByUser) {
            const user = mockData.users.find(u => u.id === p.receivedBy);
            if (user) {
              result.receivedByUser = include.receivedByUser.select
                ? Object.keys(include.receivedByUser.select).reduce((obj, key) => {
                    obj[key] = user[key];
                    return obj;
                  }, {})
                : user;
            }
          }

          return result;
        });
      }

      return payments;
    },

    findUnique: async ({ where, include }) => {
      const payment = mockData.payments.find(p => p.id === where.id);
      if (!payment) return null;

      const result = { ...payment };

      if (include) {
        if (include.invoice) {
          const invoice = mockData.invoices.find(i => i.id === payment.invoiceId);
          if (invoice) {
            result.invoice = include.invoice.select
              ? Object.keys(include.invoice.select).reduce((obj, key) => {
                  obj[key] = invoice[key];
                  return obj;
                }, {})
              : invoice;
          }
        }

        if (include.customer) {
          result.customer = mockData.customers.find(c => c.id === payment.customerId) ||
                            mockData.leads.find(l => l.id === payment.customerId);
        }

        if (include.receivedByUser) {
          const user = mockData.users.find(u => u.id === payment.receivedBy);
          if (user) {
            result.receivedByUser = include.receivedByUser.select
              ? Object.keys(include.receivedByUser.select).reduce((obj, key) => {
                  obj[key] = user[key];
                  return obj;
                }, {})
              : user;
          }
        }
      }

      return result;
    },

    create: async ({ data, include }) => {
      const newPayment = {
        id: generateId('pay'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockData.payments.push(newPayment);

      return await mockPrisma.payment.findUnique({ where: { id: newPayment.id }, include });
    },

    update: async ({ where, data, include }) => {
      const index = mockData.payments.findIndex(p => p.id === where.id);
      if (index === -1) throw new Error('Payment not found');

      mockData.payments[index] = {
        ...mockData.payments[index],
        ...data,
        updatedAt: new Date(),
      };

      return await mockPrisma.payment.findUnique({ where: { id: where.id }, include });
    },

    delete: async ({ where }) => {
      const index = mockData.payments.findIndex(p => p.id === where.id);
      if (index === -1) throw new Error('Payment not found');

      const deleted = mockData.payments.splice(index, 1)[0];
      return deleted;
    },
  },

  // WhatsAppMessage operations
  whatsappMessage: {
    findMany: async ({ where = {}, include, orderBy, skip = 0, take = 1000 }) => {
      let messages = [...mockData.whatsappMessages];

      if (where.messageType) messages = messages.filter(m => m.messageType === where.messageType);
      if (where.recipientPhone) messages = messages.filter(m => m.recipientPhone === where.recipientPhone);
      if (where.status) messages = messages.filter(m => m.status === where.status);

      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const order = orderBy[key];
        messages.sort((a, b) => {
          if (order === 'desc') return b[key] > a[key] ? 1 : -1;
          return a[key] > b[key] ? 1 : -1;
        });
      }

      messages = messages.slice(skip, skip + take);

      if (include) {
        messages = messages.map(m => {
          const result = { ...m };

          if (include.sender) {
            const user = mockData.users.find(u => u.id === m.sentBy);
            if (user) {
              result.sender = include.sender.select
                ? Object.keys(include.sender.select).reduce((obj, key) => {
                    obj[key] = user[key];
                    return obj;
                  }, {})
                : user;
            }
          }

          return result;
        });
      }

      return messages;
    },

    findUnique: async ({ where, include }) => {
      const message = mockData.whatsappMessages.find(m => m.id === where.id);
      if (!message) return null;

      const result = { ...message };

      if (include && include.sender) {
        const user = mockData.users.find(u => u.id === message.sentBy);
        if (user) {
          result.sender = include.sender.select
            ? Object.keys(include.sender.select).reduce((obj, key) => {
                obj[key] = user[key];
                return obj;
              }, {})
            : user;
        }
      }

      return result;
    },

    create: async ({ data, include }) => {
      const newMessage = {
        id: generateId('wamsg'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockData.whatsappMessages.push(newMessage);

      return await mockPrisma.whatsappMessage.findUnique({ where: { id: newMessage.id }, include });
    },

    count: async ({ where = {} }) => {
      let messages = [...mockData.whatsappMessages];

      if (where.messageType) messages = messages.filter(m => m.messageType === where.messageType);
      if (where.recipientPhone) messages = messages.filter(m => m.recipientPhone === where.recipientPhone);

      return messages.length;
    },
  },

  // Activity Log operations
  activityLog: {
    findMany: async ({ where = {}, include, orderBy, skip = 0, take = 1000 }) => {
      let logs = [...mockData.activityLogs];
      if(where.createdAt) logs=logs.filter(l=>(!where.createdAt.gte || new Date(l.createdAt)>=where.createdAt.gte)&&(!where.createdAt.lte || new Date(l.createdAt)<=where.createdAt.lte));

      // Apply filters
      if (where.userId) logs = logs.filter(l => l.userId === where.userId);
      if (where.entityType) logs = logs.filter(l => l.entityType === where.entityType);
      if (where.entityId) logs = logs.filter(l => l.entityId === where.entityId);
      if (where.action) logs = logs.filter(l => l.action === where.action);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        logs.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      // Apply pagination
      logs = logs.slice(skip, skip + take);

      // Apply include
      if (include?.user) {
        logs = logs.map(log => {
          const user = mockData.users.find(u => u.id === log.userId);
          return {
            ...log,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
            } : null,
          };
        });
      }

      return logs;
    },

    findUnique: async ({ where, include }) => {
      const log = mockData.activityLogs.find(l => l.id === where.id);
      if (!log) return null;

      if (include?.user) {
        const user = mockData.users.find(u => u.id === log.userId);
        return {
          ...log,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          } : null,
        };
      }

      return log;
    },

    create: async ({ data, include }) => {
      const newLog = {
        id: generateId('log'),
        ...data,
        createdAt: new Date(),
      };

      mockData.activityLogs.push(newLog);

      return await mockPrisma.activityLog.findUnique({ where: { id: newLog.id }, include });
    },

    delete: async ({ where }) => {
      const index = mockData.activityLogs.findIndex(l => l.id === where.id);
      if (index === -1) throw new Error('Activity log not found');

      const deleted = mockData.activityLogs.splice(index, 1)[0];
      return deleted;
    },

    count: async ({ where = {} }) => {
      let logs = [...mockData.activityLogs];
      if(where.createdAt) logs=logs.filter(l=>(!where.createdAt.gte || new Date(l.createdAt)>=where.createdAt.gte)&&(!where.createdAt.lte || new Date(l.createdAt)<=where.createdAt.lte));

      if (where.userId) logs = logs.filter(l => l.userId === where.userId);
      if (where.entityType) logs = logs.filter(l => l.entityType === where.entityType);
      if (where.action) logs = logs.filter(l => l.action === where.action);

      return logs.length;
    },
  },

  // Settings operations
  settings: {
    findMany: async ({ where = {} }) => {
      let settings = [...mockData.settings];

      // Apply filters
      if (where.category) settings = settings.filter(s => s.category === where.category);
      if (where.key) settings = settings.filter(s => s.key === where.key);

      return settings;
    },

    findUnique: async ({ where }) => {
      const setting = mockData.settings.find(s => s.key === where.key);
      return setting || null;
    },

    create: async ({ data }) => {
      const newSetting = {
        id: generateId('setting'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockData.settings.push(newSetting);
      return newSetting;
    },

    update: async ({ where, data }) => {
      const index = mockData.settings.findIndex(s => s.key === where.key);
      if (index === -1) throw new Error('Setting not found');

      mockData.settings[index] = {
        ...mockData.settings[index],
        ...data,
        updatedAt: new Date(),
      };

      return mockData.settings[index];
    },

    delete: async ({ where }) => {
      const index = mockData.settings.findIndex(s => s.key === where.key);
      if (index === -1) throw new Error('Setting not found');

      const deleted = mockData.settings.splice(index, 1)[0];
      return deleted;
    },
  },

  // Notification operations
  notification: {
    findMany: async ({ where = {}, orderBy, take = 1000 }) => {
      let notifications = [...mockData.notifications];

      // Apply filters
      if (where.userId) notifications = notifications.filter(n => n.userId === where.userId);
      if (where.isRead !== undefined) notifications = notifications.filter(n => n.isRead === where.isRead);
      if (where.type) notifications = notifications.filter(n => n.type === where.type);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        notifications.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      // Apply limit
      notifications = notifications.slice(0, take);

      return notifications;
    },

    findUnique: async ({ where }) => {
      const notification = mockData.notifications.find(n => n.id === where.id);
      return notification || null;
    },

    create: async ({ data }) => {
      const newNotification = {
        id: generateId('notif'),
        ...data,
        isRead: data.isRead !== undefined ? data.isRead : false,
        readAt: null,
        createdAt: new Date(),
      };

      mockData.notifications.push(newNotification);
      return newNotification;
    },

    update: async ({ where, data }) => {
      const index = mockData.notifications.findIndex(n => n.id === where.id);
      if (index === -1) throw new Error('Notification not found');

      mockData.notifications[index] = {
        ...mockData.notifications[index],
        ...data,
      };

      return mockData.notifications[index];
    },

    delete: async ({ where }) => {
      const index = mockData.notifications.findIndex(n => n.id === where.id);
      if (index === -1) throw new Error('Notification not found');

      const deleted = mockData.notifications.splice(index, 1)[0];
      return deleted;
    },

    count: async ({ where = {} }) => {
      let notifications = [...mockData.notifications];

      if (where.userId) notifications = notifications.filter(n => n.userId === where.userId);
      if (where.isRead !== undefined) notifications = notifications.filter(n => n.isRead === where.isRead);
      if (where.type) notifications = notifications.filter(n => n.type === where.type);

      return notifications.length;
    },
  },

  // Material operations
  material: {
    findMany: async ({ where = {}, orderBy, take = 1000, include }) => {
      let materials = [...mockData.materials];

      // Apply filters
      if (where.category) materials = materials.filter(m => m.category === where.category);
      if (where.sku) materials = materials.filter(m => m.sku === where.sku);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        materials.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      materials = materials.slice(0, take);

      // Apply include if provided
      if (include?.supplier) {
        materials = materials.map(m => ({
          ...m,
          supplier: m.supplierId ? mockData.suppliers.find(s => s.id === m.supplierId) : null,
        }));
      }

      return materials;
    },

    findUnique: async ({ where }) => {
      let material = null;
      if (where.id) material = mockData.materials.find(m => m.id === where.id);
      if (where.sku) material = mockData.materials.find(m => m.sku === where.sku);
      return material || null;
    },

    create: async ({ data }) => {
      const newMaterial = {
        id: generateId('mat'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.materials.push(newMaterial);
      return newMaterial;
    },

    update: async ({ where, data }) => {
      const index = mockData.materials.findIndex(m => m.id === where.id);
      if (index === -1) throw new Error('Material not found');

      mockData.materials[index] = {
        ...mockData.materials[index],
        ...data,
      };

      return mockData.materials[index];
    },

    delete: async ({ where }) => {
      const index = mockData.materials.findIndex(m => m.id === where.id);
      if (index === -1) throw new Error('Material not found');

      const deleted = mockData.materials.splice(index, 1)[0];
      return deleted;
    },

    count: async ({ where = {} }) => {
      return mockData.materials.length;
    },
  },

  // Supplier operations
  supplier: {
    findMany: async ({ orderBy }) => {
      let suppliers = [...mockData.suppliers];

      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        suppliers.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      return suppliers;
    },

    findUnique: async ({ where }) => {
      const supplier = mockData.suppliers.find(s => s.id === where.id);
      return supplier || null;
    },

    create: async ({ data }) => {
      const newSupplier = {
        id: generateId('supplier'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.suppliers.push(newSupplier);
      return newSupplier;
    },

    update: async ({ where, data }) => {
      const index = mockData.suppliers.findIndex(s => s.id === where.id);
      if (index === -1) throw new Error('Supplier not found');

      mockData.suppliers[index] = {
        ...mockData.suppliers[index],
        ...data,
      };

      return mockData.suppliers[index];
    },

    count: async () => {
      return mockData.suppliers.length;
    },
  },

  // Purchase Order operations
  purchaseOrder: {
    findMany: async ({ where = {}, include, orderBy, take = 1000 }) => {
      let pos = [...mockData.purchaseOrders];

      // Apply filters
      if (where.status) pos = pos.filter(p => p.status === where.status);
      if (where.supplierId) pos = pos.filter(p => p.supplierId === where.supplierId);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        pos.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      pos = pos.slice(0, take);

      // Apply includes
      if (include) {
        pos = pos.map(po => {
          const result = { ...po };

          if (include.supplier) {
            const supplier = mockData.suppliers.find(s => s.id === po.supplierId);
            result.supplier = include.supplier.select
              ? Object.keys(include.supplier.select).reduce((acc, key) => {
                  acc[key] = supplier[key];
                  return acc;
                }, {})
              : supplier;
          }

          if (include.items) {
            const items = mockData.purchaseOrderItems
              .filter(item => item.purchaseOrderId === po.id)
              .map(item => {
                if (include.items.include?.material) {
                  const material = mockData.materials.find(m => m.id === item.materialId);
                  return {
                    ...item,
                    material: include.items.include.material.select
                      ? Object.keys(include.items.include.material.select).reduce((acc, key) => {
                          acc[key] = material[key];
                          return acc;
                        }, {})
                      : material,
                  };
                }
                return item;
              });
            result.items = items;
          }

          return result;
        });
      }

      return pos;
    },

    findUnique: async ({ where, include }) => {
      let po = mockData.purchaseOrders.find(p => p.id === where.id);
      if (!po) return null;

      // Apply includes
      if (include) {
        po = { ...po };

        if (include.supplier) {
          po.supplier = mockData.suppliers.find(s => s.id === po.supplierId);
        }

        if (include.items) {
          const items = mockData.purchaseOrderItems
            .filter(item => item.purchaseOrderId === po.id)
            .map(item => {
              if (include.items.include?.material) {
                const material = mockData.materials.find(m => m.id === item.materialId);
                return { ...item, material };
              }
              return item;
            });
          po.items = items;
        }
      }

      return po;
    },

    create: async ({ data }) => {
      const newPO = {
        id: generateId('po'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.purchaseOrders.push(newPO);
      return newPO;
    },

    update: async ({ where, data }) => {
      const index = mockData.purchaseOrders.findIndex(p => p.id === where.id);
      if (index === -1) throw new Error('Purchase order not found');

      mockData.purchaseOrders[index] = {
        ...mockData.purchaseOrders[index],
        ...data,
      };

      return mockData.purchaseOrders[index];
    },

    count: async () => {
      return mockData.purchaseOrders.length;
    },
  },

  // Purchase Order Item operations
  purchaseOrderItem: {
    findMany: async ({ where = {}, include }) => {
      let items = [...mockData.purchaseOrderItems];

      if (where.purchaseOrderId) {
        items = items.filter(i => i.purchaseOrderId === where.purchaseOrderId);
      }

      // Apply includes
      if (include?.material) {
        items = items.map(item => ({
          ...item,
          material: mockData.materials.find(m => m.id === item.materialId),
        }));
      }

      return items;
    },

    findUnique: async ({ where, include }) => {
      let item = mockData.purchaseOrderItems.find(i => i.id === where.id);
      if (!item) return null;

      if (include?.material) {
        item = {
          ...item,
          material: mockData.materials.find(m => m.id === item.materialId),
        };
      }

      return item;
    },

    create: async ({ data }) => {
      const newItem = {
        id: generateId('poi'),
        ...data,
        createdAt: new Date(),
      };
      mockData.purchaseOrderItems.push(newItem);
      return newItem;
    },

    update: async ({ where, data }) => {
      const index = mockData.purchaseOrderItems.findIndex(i => i.id === where.id);
      if (index === -1) throw new Error('Purchase order item not found');

      mockData.purchaseOrderItems[index] = {
        ...mockData.purchaseOrderItems[index],
        ...data,
      };

      return mockData.purchaseOrderItems[index];
    },
  },

  // Stock Movement operations
  stockMovement: {
    findMany: async ({ where = {}, include, orderBy, take = 1000 }) => {
      let movements = [...mockData.stockMovements];

      // Apply filters
      if (where.materialId) movements = movements.filter(m => m.materialId === where.materialId);
      if (where.type) movements = movements.filter(m => m.type === where.type);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        movements.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      movements = movements.slice(0, take);

      // Apply includes
      if (include?.material) {
        movements = movements.map(m => {
          const material = mockData.materials.find(mat => mat.id === m.materialId);
          return {
            ...m,
            material: include.material.select
              ? Object.keys(include.material.select).reduce((acc, key) => {
                  acc[key] = material[key];
                  return acc;
                }, {})
              : material,
          };
        });
      }

      return movements;
    },

    create: async ({ data }) => {
      const newMovement = {
        id: generateId('sm'),
        ...data,
        createdAt: new Date(),
      };
      mockData.stockMovements.push(newMovement);
      return newMovement;
    },

    count: async () => {
      return mockData.stockMovements.length;
    },
  },

  // Catalogue operations
  catalogue: {
    findMany: async ({ where = {}, include, orderBy, take = 1000 }) => {
      let catalogues = [...mockData.catalogues];

      // Apply filters
      if (where.customerId) catalogues = catalogues.filter(c => c.customerId === where.customerId);
      if (where.status) catalogues = catalogues.filter(c => c.status === where.status);
      if (where.shareLink) catalogues = catalogues.filter(c => c.shareLink === where.shareLink);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        catalogues.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      catalogues = catalogues.slice(0, take);

      // Apply includes
      if (include) {
        catalogues = catalogues.map(cat => {
          const result = { ...cat };

          if (include.customer) {
            const customer = mockData.customers.find(c => c.id === cat.customerId) || mockData.leads.find(l => l.id === cat.customerId);
            result.customer = include.customer.select
              ? Object.keys(include.customer.select).reduce((acc, key) => {
                  acc[key] = customer?.[key];
                  return acc;
                }, {})
              : customer;
          }

          if (include.items) {
            const items = mockData.catalogueItems
              .filter(item => item.catalogueId === cat.id)
              .map(item => {
                if (include.items.include?.product) {
                  const product = mockData.products.find(p => p.id === item.productId) || (item.description ? {name:item.description, id:null} : null);
                  return {
                    ...item,
                    product: include.items.include.product.select
                      ? Object.keys(include.items.include.product.select).reduce((acc, key) => {
                          acc[key] = product[key];
                          return acc;
                        }, {})
                      : product,
                  };
                }
                return item;
              });
            result.items = items;
          }

          if (include.analytics) {
            result.analytics = mockData.catalogueAnalytics.filter(a => a.catalogueId === cat.id);
          }

          return result;
        });
      }

      return catalogues;
    },

    findUnique: async ({ where, include }) => {
      let catalogue = null;
      if (where.id) catalogue = mockData.catalogues.find(c => c.id === where.id);
      if (where.shareLink) catalogue = mockData.catalogues.find(c => c.shareLink === where.shareLink);

      if (!catalogue) return null;

      // Apply includes
      if (include) {
        catalogue = { ...catalogue };

        if (include.customer) {
          const customer = mockData.customers.find(c => c.id === catalogue.customerId) || mockData.leads.find(l => l.id === catalogue.customerId);
          catalogue.customer = include.customer.select
            ? Object.keys(include.customer.select).reduce((acc, key) => {
                acc[key] = customer?.[key];
                return acc;
              }, {})
            : customer;
        }

        if (include.items) {
          const items = mockData.catalogueItems
            .filter(item => item.catalogueId === catalogue.id)
            .map(item => {
              if (include.items.include?.product) {
                const product = mockData.products.find(p => p.id === item.productId) || (item.description ? {name:item.description, id:null} : null);
                return { ...item, product };
              }
              return item;
            });
          catalogue.items = items;
        }

        if (include.analytics) {
          catalogue.analytics = mockData.catalogueAnalytics.filter(a => a.catalogueId === catalogue.id);
        }
      }

      return catalogue;
    },

    create: async ({ data }) => {
      const newCatalogue = {
        id: generateId('cat'),
        ...data,
        viewCount: data.viewCount !== undefined ? data.viewCount : 0,
        sharedAt: data.sharedAt || null,
        lastViewedAt: data.lastViewedAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.catalogues.push(newCatalogue);
      return newCatalogue;
    },

    update: async ({ where, data }) => {
      const index = mockData.catalogues.findIndex(c => c.id === where.id);
      if (index === -1) throw new Error('Catalogue not found');

      if (data.items?.deleteMany) mockData.catalogueItems = mockData.catalogueItems.filter(item=>item.catalogueId !== where.id);
      if (data.items?.create) for(const item of data.items.create) mockData.catalogueItems.push({id:generateId('catitem'),catalogueId:where.id,...item});
      mockData.catalogues[index] = {
        ...mockData.catalogues[index],
        ...data,
        ...(data.viewCount && typeof data.viewCount === 'object' ? {viewCount:Number(mockData.catalogues[index].viewCount||0)+Number(data.viewCount.increment||0)} : {}),
      };

      return mockData.catalogues[index];
    },

    delete: async ({ where }) => {
      const index = mockData.catalogues.findIndex(c => c.id === where.id);
      if (index === -1) throw new Error('Catalogue not found');

      const deleted = mockData.catalogues.splice(index, 1)[0];
      return deleted;
    },

    count: async () => {
      return mockData.catalogues.length;
    },
  },

  // Catalogue Item operations
  catalogueItem: {
    findMany: async ({ where = {}, include }) => {
      let items = [...mockData.catalogueItems];

      if (where.catalogueId) {
        items = items.filter(i => i.catalogueId === where.catalogueId);
      }

      // Apply includes
      if (include?.product) {
        items = items.map(item => ({
          ...item,
          product: mockData.products.find(p => p.id === item.productId) || (item.description ? {name:item.description, id:null} : null),
        }));
      }

      return items;
    },

    create: async ({ data }) => {
      const newItem = {
        id: generateId('catitem'),
        ...data,
        createdAt: new Date(),
      };
      mockData.catalogueItems.push(newItem);
      return newItem;
    },

    count: async () => {
      return mockData.catalogueItems.length;
    },
  },

  // Catalogue Analytics operations
  catalogueAnalytics: {
    findMany: async ({ where = {}, orderBy, take = 1000 }) => {
      let analytics = [...mockData.catalogueAnalytics];

      if (where.catalogueId) {
        analytics = analytics.filter(a => a.catalogueId === where.catalogueId);
      }

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        analytics.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      analytics = analytics.slice(0, take);

      return analytics;
    },

    create: async ({ data }) => {
      const newAnalytics = {
        id: generateId('analytics'),
        ...data,
        timestamp: data.timestamp || new Date(),
      };
      mockData.catalogueAnalytics.push(newAnalytics);
      return newAnalytics;
    },

    count: async () => {
      return mockData.catalogueAnalytics.length;
    },
  },

  // Proforma Invoice operations
  proformaInvoice: {
    findMany: async ({ where = {}, include, orderBy, take = 1000 }) => {
      let proformas = [...mockData.proformaInvoices];

      // Apply filters
      if (where.customerId) proformas = proformas.filter(p => p.customerId === where.customerId);
      if (where.status) proformas = proformas.filter(p => p.status === where.status);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        proformas.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      proformas = proformas.slice(0, take);

      // Apply includes
      if (include) {
        proformas = proformas.map(pi => {
          const result = { ...pi };

          if (include.customer) {
            const customer = mockData.leads.find(l => l.id === pi.customerId);
            result.customer = include.customer.select
              ? Object.keys(include.customer.select).reduce((acc, key) => {
                  acc[key] = customer?.[key];
                  return acc;
                }, {})
              : customer;
          }

          if (include.items) {
            const items = mockData.proformaItems
              .filter(item => item.proformaInvoiceId === pi.id)
              .map(item => {
                if (include.items.include?.product) {
                  const product = mockData.products.find(p => p.id === item.productId) || (item.description ? {name:item.description, id:null} : null);
                  return {
                    ...item,
                    product: include.items.include.product.select
                      ? Object.keys(include.items.include.product.select).reduce((acc, key) => {
                          acc[key] = product[key];
                          return acc;
                        }, {})
                      : product,
                  };
                }
                return item;
              });
            result.items = items;
          }

          return result;
        });
      }

      return proformas;
    },

    findUnique: async ({ where, include }) => {
      let proforma = mockData.proformaInvoices.find(p => p.id === where.id);
      if (!proforma) return null;

      // Apply includes
      if (include) {
        proforma = { ...proforma };

        if (include.customer) {
          proforma.customer = mockData.leads.find(l => l.id === proforma.customerId);
        }

        if (include.items) {
          const items = mockData.proformaItems
            .filter(item => item.proformaInvoiceId === proforma.id)
            .map(item => {
              if (include.items.include?.product) {
                const product = mockData.products.find(p => p.id === item.productId) || (item.description ? {name:item.description, id:null} : null);
                return { ...item, product };
              }
              return item;
            });
          proforma.items = items;
        }
      }

      return proforma;
    },

    create: async ({ data }) => {
      if (data.quotationId && mockData.proformaInvoices.some(row=>row.quotationId === data.quotationId)) throw Object.assign(new Error('This source already has a linked proformaInvoice'),{code:'P2002'});
      const newProforma = {
        id: generateId('pi'),
        ...data,
        acceptedAt: data.acceptedAt || null,
        rejectedAt: data.rejectedAt || null,
        convertedAt: data.convertedAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.proformaInvoices.push(newProforma);
      return newProforma;
    },

    update: async ({ where, data }) => {
      const index = mockData.proformaInvoices.findIndex(p => p.id === where.id);
      if (index === -1) throw new Error('Proforma invoice not found');

      mockData.proformaInvoices[index] = {
        ...mockData.proformaInvoices[index],
        ...data,
      };

      return mockData.proformaInvoices[index];
    },

    delete: async ({ where }) => {
      const index = mockData.proformaInvoices.findIndex(p => p.id === where.id);
      if (index === -1) throw new Error('Proforma invoice not found');

      const deleted = mockData.proformaInvoices.splice(index, 1)[0];
      return deleted;
    },

    count: async () => {
      return mockData.proformaInvoices.length;
    },
  },

  // Proforma Item operations
  proformaItem: {
    findMany: async ({ where = {}, include }) => {
      let items = [...mockData.proformaItems];

      if (where.proformaInvoiceId) {
        items = items.filter(i => i.proformaInvoiceId === where.proformaInvoiceId);
      }

      // Apply includes
      if (include?.product) {
        items = items.map(item => ({
          ...item,
          product: mockData.products.find(p => p.id === item.productId) || (item.description ? {name:item.description, id:null} : null),
        }));
      }

      return items;
    },

    create: async ({ data }) => {
      const newItem = {
        id: generateId('piitem'),
        ...data,
        createdAt: new Date(),
      };
      mockData.proformaItems.push(newItem);
      return newItem;
    },

    count: async () => {
      return mockData.proformaItems.length;
    },
  },

  // Production Stage operations
  productionStage: {
    findMany: async ({ where = {}, orderBy, take = 1000 }) => {
      let stages = [...mockData.productionStages];

      // Apply filters
      if (where.productionId) stages = stages.filter(s => s.productionId === where.productionId);
      if (where.orderId) stages = stages.filter(s => s.orderId === where.orderId);
      if (where.status) stages = stages.filter(s => s.status === where.status);

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        stages.sort((a, b) => {
          if (direction === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }

      stages = stages.slice(0, take);

      return stages;
    },

    findUnique: async ({ where }) => {
      const stage = mockData.productionStages.find(s => s.id === where.id);
      return stage || null;
    },

    findFirst: async ({ where = {} }) => {
      let stages = [...mockData.productionStages];

      if (where.productionId) stages = stages.filter(s => s.productionId === where.productionId);
      if (where.stageOrder) stages = stages.filter(s => s.stageOrder === where.stageOrder);

      return stages[0] || null;
    },

    create: async ({ data }) => {
      const newStage = {
        id: generateId('stage'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.productionStages.push(newStage);
      return newStage;
    },

    update: async ({ where, data }) => {
      const index = mockData.productionStages.findIndex(s => s.id === where.id);
      if (index === -1) throw new Error('Production stage not found');

      mockData.productionStages[index] = {
        ...mockData.productionStages[index],
        ...data,
      };

      return mockData.productionStages[index];
    },

    count: async () => {
      return mockData.productionStages.length;
    },
  },

  // Material Consumption operations
  materialConsumption: {
    findMany: async ({ where = {} }) => {
      let consumptions = [...mockData.materialConsumptions];

      if (where.stageId) consumptions = consumptions.filter(c => c.stageId === where.stageId);
      if (where.materialId) consumptions = consumptions.filter(c => c.materialId === where.materialId);

      return consumptions;
    },

    create: async ({ data }) => {
      const newConsumption = {
        id: generateId('mc'),
        ...data,
        createdAt: new Date(),
      };
      mockData.materialConsumptions.push(newConsumption);
      return newConsumption;
    },

    count: async () => {
      return mockData.materialConsumptions.length;
    },
  },

  // Dispatch operations
  dispatch: {
    findMany: async ({ where = {}, include = {}, orderBy = {} } = {}) => {
      let dispatches = [...mockData.dispatches];

      // Apply filters
      if (where.id) dispatches = dispatches.filter(d => d.id === where.id);
      if (where.productionId) dispatches = dispatches.filter(d => d.productionId === where.productionId);
      if (where.orderId) dispatches = dispatches.filter(d => d.orderId === where.orderId);
      if (where.customerId) dispatches = dispatches.filter(d => d.customerId === where.customerId);
      if (where.status) dispatches = dispatches.filter(d => d.status === where.status);
      if (where.courierName) dispatches = dispatches.filter(d => d.courierName === where.courierName);

      // Apply includes
      if (include.customer) {
        dispatches = dispatches.map(d => ({
          ...d,
          customer: mockData.customers.find(c => c.id === d.customerId),
        }));
      }
      if (include.order) {
        dispatches = dispatches.map(d => ({
          ...d,
          order: mockData.orders.find(o => o.id === d.orderId),
        }));
      }
      if (include.production) {
        dispatches = dispatches.map(d => ({
          ...d,
          production: mockData.productionTracking.find(p => p.id === d.productionId),
        }));
      }
      if (include.createdByUser) {
        dispatches = dispatches.map(d => ({
          ...d,
          createdByUser: mockData.users.find(u => u.id === d.createdBy),
        }));
      }
      if (include.updatedByUser) {
        dispatches = dispatches.map(d => ({
          ...d,
          updatedByUser: d.updatedBy ? mockData.users.find(u => u.id === d.updatedBy) : null,
        }));
      }

      // Apply ordering
      if (orderBy.createdAt === 'desc') {
        dispatches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (orderBy.createdAt === 'asc') {
        dispatches.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
      if (orderBy.dispatchDate === 'desc') {
        dispatches.sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));
      }

      return dispatches;
    },

    findUnique: async ({ where, include = {} }) => {
      let dispatch = mockData.dispatches.find(d => d.id === where.id);
      if (!dispatch) return null;

      dispatch = { ...dispatch };

      // Apply includes
      if (include.customer) {
        dispatch.customer = mockData.customers.find(c => c.id === dispatch.customerId);
      }
      if (include.order) {
        dispatch.order = mockData.orders.find(o => o.id === dispatch.orderId);
      }
      if (include.production) {
        dispatch.production = mockData.productionTracking.find(p => p.id === dispatch.productionId);
      }
      if (include.createdByUser) {
        dispatch.createdByUser = mockData.users.find(u => u.id === dispatch.createdBy);
      }
      if (include.updatedByUser) {
        dispatch.updatedByUser = dispatch.updatedBy
          ? mockData.users.find(u => u.id === dispatch.updatedBy)
          : null;
      }

      return dispatch;
    },

    findFirst: async ({ where = {}, include = {} }) => {
      const dispatches = await mockPrisma.dispatch.findMany({ where, include });
      return dispatches.length > 0 ? dispatches[0] : null;
    },

    create: async ({ data }) => {
      if (mockData.dispatches.some(d=>(data.productionId && d.productionId===data.productionId) || (data.orderId && d.orderId===data.orderId))) throw Object.assign(new Error('Dispatch already exists for this ready order'),{code:'P2002'});
      const newDispatch = {
        id: generateId('dispatch'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.dispatches.push(newDispatch);
      return newDispatch;
    },

    update: async ({ where, data }) => {
      const index = mockData.dispatches.findIndex(d => d.id === where.id);
      if (index === -1) throw new Error('Dispatch not found');

      mockData.dispatches[index] = {
        ...mockData.dispatches[index],
        ...data,
        updatedAt: new Date(),
      };

      return mockData.dispatches[index];
    },

    delete: async ({ where }) => {
      const index = mockData.dispatches.findIndex(d => d.id === where.id);
      if (index === -1) throw new Error('Dispatch not found');

      const deleted = mockData.dispatches[index];
      mockData.dispatches.splice(index, 1);
      return deleted;
    },

    count: async () => {
      return mockData.dispatches.length;
    },
  },

  // Campaign operations
  campaign: {
    findMany: async ({ where = {}, include = {}, orderBy = {} } = {}) => {
      let campaigns = [...mockData.campaigns];

      // Apply filters
      if (where.id) campaigns = campaigns.filter(c => c.id === where.id);
      if (where.status) campaigns = campaigns.filter(c => c.status === where.status);
      if (where.platform) campaigns = campaigns.filter(c => c.platform === where.platform);
      if (where.type) campaigns = campaigns.filter(c => c.type === where.type);

      // Apply includes
      if (include.createdByUser) {
        campaigns = campaigns.map(c => ({
          ...c,
          createdByUser: mockData.users.find(u => u.id === c.createdBy),
        }));
      }
      if (include.leads) {
        campaigns = campaigns.map(c => ({
          ...c,
          leads: mockData.leads.filter(l => l.campaignId === c.id),
        }));
      }
      if (include._count) {
        campaigns = campaigns.map(c => ({
          ...c,
          _count: {
            leads: mockData.leads.filter(l => l.campaignId === c.id).length,
          },
        }));
      }

      // Apply ordering
      if (orderBy.createdAt === 'desc') {
        campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (orderBy.createdAt === 'asc') {
        campaigns.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }

      return campaigns;
    },

    findUnique: async ({ where, include = {} }) => {
      let campaign = mockData.campaigns.find(c => c.id === where.id);
      if (!campaign) return null;

      campaign = { ...campaign };

      // Apply includes
      if (include.createdByUser) {
        campaign.createdByUser = mockData.users.find(u => u.id === campaign.createdBy);
      }
      if (include.leads) {
        campaign.leads = mockData.leads.filter(l => l.campaignId === campaign.id).map(l => ({
          ...l,
          salesPerson: mockData.users.find(u => u.id === l.salesPersonId),
        }));
      }

      return campaign;
    },

    create: async ({ data }) => {
      const newCampaign = {
        id: generateId('campaign'),
        ...data,
        spent: data.spent || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.campaigns.push(newCampaign);
      return newCampaign;
    },

    update: async ({ where, data }) => {
      const index = mockData.campaigns.findIndex(c => c.id === where.id);
      if (index === -1) throw new Error('Campaign not found');

      mockData.campaigns[index] = {
        ...mockData.campaigns[index],
        ...data,
        updatedAt: new Date(),
      };

      return mockData.campaigns[index];
    },

    delete: async ({ where }) => {
      const index = mockData.campaigns.findIndex(c => c.id === where.id);
      if (index === -1) throw new Error('Campaign not found');

      const deleted = mockData.campaigns[index];
      mockData.campaigns.splice(index, 1);
      return deleted;
    },

    count: async ({ where = {} } = {}) => {
      let campaigns = mockData.campaigns;
      if (where.status) campaigns = campaigns.filter(c => c.status === where.status);
      return campaigns.length;
    },
  },

  // Database connection
  $connect: async () => {
    console.log('✅ Mock database connected (in-memory)');
  },

  $disconnect: async () => {
    console.log('👋 Mock database disconnected');
  },
};

module.exports = { mockPrisma };
