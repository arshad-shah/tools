import {
  IconAlertCircle,
  IconCalendar,
  IconClock,
  IconGlobe,
  IconHash,
  IconInfo,
  IconKey,
  IconMail,
  IconShield,
  IconTarget,
  IconUser,
  IconZap,
} from '@/shared/ui/icons';

const getClaimIcon = (key: string) => {
  const icons: Record<string, React.ReactNode> = {
    sub: <IconUser size="sm" />,
    name: <IconUser size="sm" />,
    email: <IconMail size="sm" />,
    role: <IconShield size="sm" />,
    roles: <IconShield size="sm" />,
    permissions: <IconKey size="sm" />,
    iat: <IconCalendar size="sm" />,
    exp: <IconClock size="sm" />,
    nbf: <IconAlertCircle size="sm" />,
    iss: <IconGlobe size="sm" />,
    aud: <IconTarget size="sm" />,
    scope: <IconZap size="sm" />,
    jti: <IconHash size="sm" />,
  };
  return icons[key] || <IconInfo size="sm" />;
};

export { getClaimIcon };
