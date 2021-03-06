import { patchEntity } from './patch-entity';

describe('patchEntity()', () => {
    it('updates non-null values', () => {
        const entity: any = {
            foo: 'foo',
            bar: 'bar',
            baz: 'baz',
        };

        const result = patchEntity(entity, { bar: 'bar2', baz: null });
        expect(result).toEqual({
            foo: 'foo',
            bar: 'bar2',
            baz: 'baz',
        });
    });

    it('does not update id field', () => {
        const entity: any = {
            id: 123,
            bar: 'bar',
        };

        const result = patchEntity(entity, { id: 456 });
        expect(result).toEqual({
            id: 123,
            bar: 'bar',
        });
    });

    it('updates individual customFields', () => {
        const entity: any = {
            customFields: {
                cf1: 'cf1',
                cf2: 'cf2',
            },
        };

        const result = patchEntity(entity, { customFields: { cf2: 'foo' } });
        expect(result).toEqual({
            customFields: {
                cf1: 'cf1',
                cf2: 'foo',
            },
        });
    });
});
