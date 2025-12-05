// src/components/Layout/MerchantLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem, Divider,
  Badge, useMediaQuery, useTheme, Chip, Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PrintIcon from '@mui/icons-material/Print';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useAuth } from '../../hooks/useAuth';
import { signOutUser } from '../../firebase/auth';
import { useCollection } from '../../hooks/useFirestore';

const DRAWER_WIDTH = 260;

const menuItems = [
  { text: 'Print Jobs', icon: <PrintIcon />, path: '/merchant/dashboard' },
  { text: 'Analytics', icon: <BarChartIcon />, path: '/merchant/analytics' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/merchant/settings' },
];

export default function MerchantLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();

  const { documents: jobs } = useCollection('printJobs', {
    fieldName: 'merchantId',
    operator: '==',
    value: user?.uid,
  });

  const pendingCount = jobs?.filter(j => j.status === 'pending').length || 0;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    navigate('/');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorefrontIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            QuickPrint
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Merchant Portal
          </Typography>
        </Box>
      </Box>
      
      <Divider />

      {/* Shop Info */}
      <Box sx={{ p: 2, bgcolor: 'primary.lighter' }}>
        <Typography variant="subtitle2" fontWeight="bold" noWrap>
          {userData?.shopName || 'Your Shop'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {userData?.city || 'Location not set'}
        </Typography>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, px: 1, py: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleMenuClick(item.path)}
                sx={{
                  borderRadius: 2,
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'white' : 'inherit', minWidth: 40 }}>
                  {item.text === 'Print Jobs' && pendingCount > 0 ? (
                    <Badge badgeContent={pendingCount} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.text} />
                {item.text === 'Print Jobs' && pendingCount > 0 && (
                  <Chip 
                    label={pendingCount} 
                    size="small" 
                    color={isActive ? 'default' : 'error'}
                    sx={{ 
                      height: 20, 
                      fontSize: 11,
                      bgcolor: isActive ? 'rgba(255,255,255,0.2)' : undefined,
                      color: isActive ? 'white' : undefined,
                    }} 
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* User Info */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            {userData?.ownerName?.[0] || 'M'}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {userData?.ownerName || 'Merchant'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          fullWidth
          size="small"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ mt: 1.5 }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.100' }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar position="fixed" sx={{ bgcolor: 'white', color: 'text.primary' }} elevation={1}>
          <Toolbar>
            <IconButton edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <StorefrontIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
              QuickPrint
            </Typography>
            {pendingCount > 0 && (
              <Badge badgeContent={pendingCount} color="error">
                <NotificationsIcon />
              </Badge>
            )}
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: 8, md: 0 },
          minHeight: '100vh',
        }}
      >        <Outlet />
      </Box>
    </Box>
  );
}
