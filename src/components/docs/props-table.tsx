import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PropDefinition } from "@/config/components";

interface PropsTableProps {
  props: PropDefinition[];
}

const PropsTable = ({ props }: PropsTableProps) => {
  if (props.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        This component has no configurable props.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Prop</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Default</TableHead>
            <TableHead className="font-semibold">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.map((prop) => (
            <TableRow key={prop.name}>
              <TableCell className="font-mono text-sm text-primary">
                {prop.name}
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {prop.type}
              </TableCell>
              <TableCell className="font-mono text-sm">
                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">
                  {prop.default}
                </code>
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {prop.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PropsTable;
