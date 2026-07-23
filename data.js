// =========================================================================
// VERITRAIL MASTER DATABASE (ROOT LEVEL SYSTEM MOCK DATA)
// =========================================================================

window.VeriTrailDB = {
    // Load persisted users or fallback to defaults
    users: JSON.parse(localStorage.getItem('vt_users_db')) || [
        {
            employeeId: "EM-0001",
            username: "admin_it",
            displayName: "System Administrator",
            password: "password123",
            role: "it-admin",
            bypassCode: "VT-ADMIN-2026",
            companyEmail: "admin@veritrail.com",
            companyPhone: "+639170000000",
            companyAddress: "Makati HQ, Manila"
        },
        {
            employeeId: "EM-0002",
            username: "supervisor1",
            displayName: "Operations Supervisor",
            password: "password123",
            role: "supervisor",
            adminIdCode: "SUP-2026-KEY",
            companyEmail: "supervisor@veritrail.com",
            companyPhone: "+639179876543",
            companyAddress: "Makati HQ, Manila"
        },
        {
            employeeId: "EM-0003",
            username: "user_req",
            displayName: "Juan Dela Cruz",
            password: "password123",
            role: "requester",
            companyEmail: "juan.delacruz@veritrail.com",
            companyPhone: "+639185551234",
            companyAddress: "Quezon City Branch"
        },
        {
            employeeId: "EM-0004",
            username: "user_handler",
            displayName: "Elena Torralba",
            password: "password123",
            role: "handler",
            companyEmail: "elena.torralba@veritrail.com",
            companyPhone: "+639194445678",
            companyAddress: "Main Warehouse Hub"
        },
        {
            employeeId: "EM-0005",
            username: "user_courier",
            displayName: "Mark Yambao",
            password: "password123",
            role: "messenger",
            companyEmail: "mark.yambao@veritrail.com",
            companyPhone: "+639203339999",
            companyAddress: "Main Warehouse Hub"
        }
    ],

    inventory: [
        { sku: "SKU-LAP-001", name: "Dell Latitude 5420", category: "Hardware", stock: 15, location: "Main Warehouse" },
        { sku: "SKU-MON-002", name: '27" LG UltraFine Monitor', category: "Peripherals", stock: 8, location: "Main Warehouse" },
        { sku: "SKU-RTR-003", name: "Cisco Catalyst 9200 Switch", category: "Networking", stock: 4, location: "Main Warehouse" },
        { sku: "SKU-TAB-004", name: "iPad Pro 11-inch", category: "Mobile", stock: 12, location: "Cebu Hub" }
    ],

    transactions: {
        "TRX-081": {
            type: "internal",
            badge: "Internal Dispatch",
            modeText: "Internal Messenger Mode Enabled",
            statusTitle: "Asset Status: Out for Delivery",
            statusDesc: "The asset has cleared quality control inspections and packaging protocols.",
            custodian: "Logistics Dispatcher",
            status: "In Transit",
            route: "Warehouse → Makati Office",
            arrival: "4:40 PM",
            stepLevel: 3,
            externalLink: null
        },
        "TRX-102": {
            type: "internal",
            badge: "Internal Dispatch",
            modeText: "Internal Messenger Mode Enabled",
            statusTitle: "Asset Status: Requested & Awaiting Review",
            statusDesc: "The transfer request has been digitally submitted.",
            custodian: "Inventory Control",
            status: "Submitted",
            route: "Cebu Hub → Manila Main Office",
            arrival: "Pending Approval",
            stepLevel: 1,
            externalLink: null
        },
        "LBC-992": {
            type: "external",
            badge: "3rd-Party Courier",
            modeText: "Third-Party Logistics Tracking Mode",
            statusTitle: "Milestone Update: Carrier Dispatched",
            statusDesc: "Asset successfully integrated into external carrier shipping framework.",
            custodian: "LBC Express",
            status: "Out for Delivery",
            route: "WB-88213 (Waybill ID)",
            arrival: "July 22, 2026",
            stepLevel: 3,
            externalLink: "https://www.lbcexpress.com/"
        }
    },

    // Load persisted audit logs or fallback to defaults
    auditLogs: JSON.parse(localStorage.getItem('vt_audit_logs')) || [
        { id: "LOG-001", timestamp: "2026-07-20 09:15:00", user: "admin_it", action: "System initialized with pre-seeded accounts." },
        { id: "LOG-002", timestamp: "2026-07-20 10:15:00", user: "user_handler", action: "Passed quality inspection for TRX-081." }
    ]
};

window.mockLogisticsDatabase = window.VeriTrailDB.transactions;