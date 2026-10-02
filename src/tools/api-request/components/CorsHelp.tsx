import type { ToolError } from '@/shared/lib/errors';
import {
  Card,
  CardBody,
  ErrorState,
  List,
  ListItem,
  Stack,
  Text,
} from '@/shared/ui';

/**
 * An honest explanation of a blocked request (spec §8.8). The browser does
 * not say whether CORS, DNS or a dead server was the cause, and this tool
 * never offers a proxy.
 */
export function CorsHelp({ error }: { error: ToolError }) {
  const mixed = /mixed content/i.test(error.message);
  return (
    <Stack gap="3">
      <ErrorState
        error={error}
        title="Request blocked or unreachable"
        headingLevel={3}
      />
      <Card>
        <CardBody>
          <Stack gap="2">
            {mixed ? (
              <Text size="sm">
                Pages served over https cannot call http addresses. Use the
                https address of the API, or run this request from a tool
                outside the browser.
              </Text>
            ) : (
              <>
                <Text size="sm">
                  Requests go straight from your browser, so the browser
                  enforces CORS: a page may only read a response from another
                  site when that site sends an Access-Control-Allow-Origin
                  header that allows this page. Without it the browser hides the
                  response, and it reports the same failure for an unreachable
                  server or a bad certificate.
                </Text>
                <Text size="sm" weight="medium">
                  How to test
                </Text>
                <List>
                  <ListItem>
                    Check the URL, and that the server is up, with the browser
                    developer tools Network tab.
                  </ListItem>
                  <ListItem>
                    If you run the API, send Access-Control-Allow-Origin (and
                    Access-Control-Allow-Headers for custom headers) from it.
                  </ListItem>
                  <ListItem>
                    Or call it through a local proxy you control, or with Copy
                    as cURL in a terminal.
                  </ListItem>
                </List>
              </>
            )}
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
