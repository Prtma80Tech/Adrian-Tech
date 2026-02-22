ALTER TABLE investments ADD COLUMN sector text; 
ALTER TABLE investments ADD COLUMN change24h numeric; 
ALTER TABLE investments ADD COLUMN previous_change24h numeric; 
ALTER TABLE investments ADD COLUMN history jsonb;
ALTER TABLE investments ADD COLUMN previous_dividends numeric;
ALTER TABLE investments ADD COLUMN allocated_cost numeric;
