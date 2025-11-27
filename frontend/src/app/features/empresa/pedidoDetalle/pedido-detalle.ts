import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { HeaderEmpresaComponent } from '../shared/header-empresa/header-empresa.component';

interface ArticuloPedido {
    id: number;
    nombre: string;
    cantidad: number;
    descripcion?: string;
    sku?: string;
    peso?: number;
}

interface PedidoDetalle {
    id: number;
    locker: string;
    ubicacion: string;
    estado: string;
    logistica_estado: string;
    destinatario: string;
    fecha: string;
    items: ArticuloPedido[];
}

@Component({
    standalone: true,
    selector: 'app-empresa-pedido-detalle',
    imports: [CommonModule, RouterModule, DatePipe, HeaderEmpresaComponent],
    templateUrl: './pedido-detalle.html',
    styleUrls: ['./pedido-detalle.scss']
})
export class EmpresaPedidoDetalle implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);
    private location = inject(Location);

    id!: number;
    pedido?: PedidoDetalle;
    cargando = true;
    error = '';

    ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id'));
        void this.cargarPedido();
    }

    volver() {
        this.location.back();
    }

    async cargarPedido() {
        this.cargando = true;
        this.error = '';

        try {
            const res = await this.http
                .get<any>(`${environment.apiUrl}/reservas/${this.id}`)
                .toPromise();

            if (!res) {
                this.error = 'No se pudo cargar el pedido';
                return;
            }

            // Mapear datos de la API al formato del componente
            const lockerNumero = res.locker?.numero ?? res.locker?.id ?? res.locker_id ?? '';
            const locker = lockerNumero ? `#${lockerNumero}` : 'N/D';

            // La ubicación puede venir del locker asignado o de ubicacion_destino
            const ubicacionNombre = res.locker?.ubicacion?.nombre 
              ?? res?.ubicacion_destino?.nombre 
              ?? res?.ubicacionDestino?.nombre 
              ?? 'Sin ubicación';

            const usuario = res.usuario;
            const nombres = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim();
            const destinatario = nombres || usuario?.email || 'Sin destinatario';

            const logisticaEstado = String(res.logistica_estado ?? 'pendiente_repartidor');
            const estado = this.mapEstado(logisticaEstado);

            // Mapear artículos
            const items: ArticuloPedido[] = (res.articulos ?? []).map((art: any) => ({
                id: art.id,
                nombre: art.nombre,
                cantidad: art.cantidad,
                descripcion: art.descripcion,
                sku: art.sku,
                peso: art.peso,
            }));

            this.pedido = {
                id: res.id,
                locker,
                ubicacion: ubicacionNombre,
                estado,
                logistica_estado: logisticaEstado,
                destinatario,
                fecha: res.created_at || res.fecha_reserva,
                items,
            };
        } catch (err: any) {
            console.error('Error al cargar pedido', err);
            this.error = err?.error?.message || 'Error al cargar el pedido';

            // Si el pedido no existe o hay error de autorización, volver atrás
            if (err?.status === 404 || err?.status === 403) {
                setTimeout(() => {
                    void this.router.navigate(['/empresa/pedidos']);
                }, 2000);
            }
        } finally {
            this.cargando = false;
        }
    }

    private mapEstado(logisticaEstado: string): string {
        const mapeo: Record<string, string> = {
            'pendiente_repartidor': 'Pendiente',
            'asignado': 'Asignado',
            'en_camino': 'En camino',
            'completado': 'Entregado',
        };
        return mapeo[logisticaEstado] || 'Pendiente';
    }
}
